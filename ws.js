(function() {
  
  var WebSocketServer = require('ws').Server;
  var _ = require('underscore');
  var ObjectId = require('mongojs').ObjectId;
  
  var api = require('./api');
  var db = require('./db');
  
  var clients = [];
  
  var Client = function (webSocket, sessionId, fileId) {
    this._webSocket = webSocket;
    this._fileId = fileId;
    this._sessionId = sessionId;
    
    this._apiPatchListener = this._onApiPatch.bind(this);
    
    this._webSocket.on('message', this._onWebSocketMessage.bind(this));
    this._webSocket.on('close', this._onWebSocketClose.bind(this));
    
    api.on("patch", this._apiPatchListener);
  };
  
  Client.prototype = Object.create(null, {
    constructor: {
      value: Client,
      enumerable: false
    },
    
    getSessionId: {
      value: function () {
        return this._sessionId;
      }
    },
    
    _handlePatchMessage: {
      value: function (data) {
        api.filePatch(this._fileId, data, function (err, code) {
          if (err) {
            switch (code) {
              case 409:
                this._webSocket.send(JSON.stringify({
                  type: 'patchRejected',
                  data: {
                    code: code,
                    message: err
                  }
                }));
              break;
              default:
                this._webSocket.send(JSON.stringify({
                  type: 'patchError',
                  data: {
                    code: code,
                    message: err
                  }
                }));
              break;
            }
          }
        }.bind(this));
      }
    },
    
    _onApiPatch: {
      value: function (data) {
        this._webSocket.send(JSON.stringify({
          type: 'update',
          data: data
        }));
      },
    },
    
    _onWebSocketMessage: {
      value: function (data, flags) {
        // flags.binary will be set if a binary data is received
        // flags.masked will be set if the data was masked
        
        if (!flags.binary) {
          var message = JSON.parse(data);
          if (message && message.type) {
            switch (message.type) {
              case 'patch':
                this._handlePatchMessage(message.data);
              break;
              default:
                console.log("Unknown WebSocket message '" + message.type + "' received");
              break;
            }
          } else {
            console.log("invalid WebSocket message received");
          }
        } else {
          console.log("binary WebSocket message received");
        }
      }
    },
    
    _onWebSocketClose: {
      value: function () {
        api.closeSession(this._sessionId);
        api.removeListener("patch", this._apiPatchListener);
      }
    }
  });
  
  function onWebSocketServerConnection(webSocket) {
    var url = webSocket.upgradeReq.url;
    var urlParts = url.split('/');
    if (urlParts.length < 4) {
      return;
    }
    
    var fileId = urlParts[2];
    if (!fileId) {
      console.log("Failed to open WebSocket: FileId not found");
      webSocket.close(1000, "Not found");
      return;
    }
    
    var sessionId = urlParts[3];
    if (!sessionId) {
      console.log("Failed to open WebSocket: SessionId not found");
      webSocket.close(1000, "Not found");
      return;
    }
    
    db.files.findOne({ _id: new ObjectId( fileId ) }, function (err, file) {
      if (err) {
        console.log("Failed to open WebSocket: File error: " + err);
        webSocket.close(1011, err);
      } else {
        if (file) {
          db.sessions.findOne({ _id: new ObjectId( sessionId ) }, function (sessionErr, session) {
            if (sessionErr) {
              console.log("Failed to open WebSocket: Session error: " + sessionErr);
              webSocket.close(1011, sessionErr);
            } else {
              if (!session) {
                console.log("Failed to open WebSocket: Session not found");
                webSocket.close(1000, "Not found");
              } else {
                var client = new Client(webSocket, session._id.toString(), file._id.toString());
                clients.push(client);
              }
            }
          });
        } else {
          console.log("Failed to open WebSocket: File not found");
          webSocket.close(1000, "Not found");
        }
      }
    });
  }
  
  module.exports = {
    configure: function (httpServer, httpsServer) {
      if (httpServer) {
        var unsecureWebSocketServer = new WebSocketServer({
          server: httpServer
        });

        unsecureWebSocketServer.on('connection', onWebSocketServerConnection);
        
        console.log("Unsecure WebSocketServer listening");
      }
      
      if (httpsServer) {
        var secureWebSocketServer = new WebSocketServer({
           server: httpsServer
        });
        
        secureWebSocketServer.on('connection', onWebSocketServerConnection);
        
        console.log("Secure WebSocketServer listening");
      }
            
      api.on("sessionClose", function (data) {
        for (var i = clients.length - 1; i >= 0; i--) {
          if (clients[i].getSessionId() === data.sessionId) {
            clients.splice(i, 1);
            break;
          }
        }
      });
    }
  };
  
}).call(this);