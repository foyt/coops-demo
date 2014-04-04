(function() {
  
  var crypto = require('crypto');
  var _ = require('underscore');
  var ObjectId = require('mongojs').ObjectId;
  var EventEmitter = require('events').EventEmitter;
  
  var settings = require('../settings.json');
  var db = require('../db');
  var algorithms = require('../algorithms');
  
  var COOPS_PROTOCOL_VERSION = "1.0.0";
  
  function findFile(fileId, done) {
    if (!fileId) {
      done(null, null);
    }
    
    db.files.findOne({ _id: new ObjectId(fileId.toString()) }, done);
  }
  
  var apiEvents = new EventEmitter();
  
  module.exports = {
      
    fileGet: function (revisionNumber, fileId, done) {
      if (isNaN(revisionNumber)) {
        findFile(fileId, function (err, file) {
          if (err) {
            done(err, 500, null);
          } else {
            if (!file) {
              done("Not Found", 404, null);
            } else {
              done(null, 200, {
                "revisionNumber": file.revisionNumber,
                "content": file.content,
                "contentType": file.contentType,
                "properties": file.properties
              });
            }
          }
        });
      } else {
        done("Not implemented", 501, null);
      }
    },
    
    fileUpdate: function (revisionNumber, fileId, done) {
      if (isNaN(revisionNumber)) {
        done("revisionNumber parameter is missing", 400, null);
        return;
      }
      
      findFile(fileId, function (err, file) {
        if (err) {
          done(err, 500, null);
        } else {
          if (!file) {
            done("Not Found", 404, null);
          } else {
            db.filerevisions.find( { fileId: file._id,  "revisionNumber": { $gt: revisionNumber } }, function (err, fileRevisions) {
              if (err) {
                done(err, 500, null);
              } else {
                if (fileRevisions.length === 0) {
                  done(null, 204, null);
                } else {
                  var patches = [];
                  
                  for (var i = 0, l = fileRevisions.length; i < l; i++) {
                    var fileRevision = fileRevisions[i];
                    patches.push({
                      "sessionId": fileRevision.sessionId,
                      "revisionNumber": parseInt(fileRevision.revisionNumber, 10),
                      "checksum": fileRevision.checksum,
                      "patch": fileRevision.patch,
                      "properties": fileRevision.properties,
                      "extensions": fileRevision.extensions
                    });
                  }
                  
                  done(null, 200, patches);
                }
              }
            });
          }
        }
      });
    },
    
    filePatch: function (fileId, patch, done) {
      var valid = true;
      var message = null;
      var status = 200;
      var algorithm = null;
      
      if (!patch || !patch.sessionId) {
        valid = false;
        message = "Invalid request";
        status = 400;
      }
      
      db.sessions.findOne({ _id: new ObjectId( patch.sessionId.toString() ) }, function (sessionErr, session) {
        if (sessionErr) {
          done(sessionErr, 500, null);
          return;
        }
        
        if (!session) {
          done("Session could not be found", 403);
          return;
        }

        algorithm = algorithms.getAlgorithm(session.algorithm);
        if (!algorithm) {
          valid = false;
          message = "Algorithm is not supported by this server";
          status = 400;
        }
        
        if (!valid) {
          done(message, status);
        } else {
          findFile(fileId, function (err, file) {
            if (err) {
              done(err, 500);
            } else {
              if (parseInt(file.revisionNumber, 10) !== parseInt(patch.revisionNumber, 10)) {
                done("Server version does not match client version", 409);
              } else {
                var patchRevisionNumber = file.revisionNumber + 1;
                var patchText = patch.patch;
                var sessionId = patch.sessionId;
                var fileProperties = file.properties||{};
                var patchProperties = patch.properties;
                var patchExtensions = patch.extensions;

                algorithm.patch(patchText, file.content, fileProperties, patchProperties, function (err, content, patchProperties) {
                  if (err) {
                    done(err, 500);
                  } else {
                    var checksum = crypto.createHash('md5').update(content).digest('hex');

                    db.filerevisions.insert({
                      fileId: file._id,
                      revisionNumber: patchRevisionNumber,
                      patch: patchText,
                      checksum: checksum,
                      sessionId: sessionId,
                      properties: patchProperties,
                      extensions: patchExtensions
                    }, function (revisionErr, fileRevision) {
                      if (revisionErr) {
                        done(revisionErr, 500);
                      } else {
                        db.files.update({ _id: new ObjectId(fileId.toString()) },{ content: content, revisionNumber: patchRevisionNumber, properties: _.extend(fileProperties, fileRevision.properties), contentType: file.contentType, }, { multi: false }, function(updateErr) {
                          if (updateErr) {
                            done(updateErr, 500);
                          } else {
                            apiEvents.emit("patch", {
                              fileId: file._id,
                              revisionNumber: patchRevisionNumber,
                              patch: patchText,
                              checksum: checksum,
                              sessionId: sessionId,
                              properties: patchProperties,
                              extensions: patchExtensions
                            });
                            
                            done(null, 204);
                          }
                        });
                      }
                    });
                  }
                });
              }
            }
          });
        }
      });
    },
    
    fileJoin: function (fileId, userId, clientAlgorithms, protocolVersion, done) {
      findFile(fileId, function (err, file) {
        if (err) {
          done(err, 500, null);
        } else {
          if (!file) {
            done("Not Found", 404, null);
          } else {
            if ((clientAlgorithms.length === 0)||(!protocolVersion)) {
              done("Invalid request", 500, null);
              return;
            }
            
            if (COOPS_PROTOCOL_VERSION !== protocolVersion) {
              done("Protocol version mismatch. Client is using " + protocolVersion + " and server " + COOPS_PROTOCOL_VERSION, 501, null);
              return;
            }
            
            var algorithm = null;
            
            for (var i = 0, l = clientAlgorithms.length; i < l; i++) {
              var clientAlgorithm = clientAlgorithms[i];
              algorithm = algorithms.getAlgorithm(clientAlgorithm);
              if (algorithm !== null) {
                // TODO: Check content type
                // TODO: Appropriate for the file?
                break;
              }
            }
            
            if (!algorithm) {
              done("Server and client do not have a commonly supported algorithm. " +
                   "Server supported: " + algorithms.getAlgorithms().toString() + ", " +
                   "Client supported: " + clientAlgorithms.toString(), 501, null);
              return;
            } else {
              db.sessions.insert({ userId: userId, algorithm: algorithm.getName() }, function (sessionErr, session) {
                if (sessionErr) {
                  done(sessionErr, 500, null);
                } else {
                  var extensions = {
                    "x-http-method-override": {}
                  };
                  
                  if (settings.ws || settings.wss) {
                    var webSocketExtension = {};
                    
                    if (settings.ws && settings.ws.host && settings.ws.port) {
                      webSocketExtension.ws = "ws://" + settings.ws.host + ':' + settings.ws.port + '/ws/' + file._id + '/' + session._id;
                    }
                    
                    if (settings.wss && settings.wss.host && settings.wss.port) {
                      webSocketExtension.wss = "wss://" + settings.wss.host + ':' + settings.wss.port + '/ws/' + file._id + '/' + session._id;
                    }
                    
                    extensions.webSocket = webSocketExtension;
                  }
                  
                  done(null, 200, {
                    "sessionId": session._id,
                    "algorithm": session.algorithm,
                    "revisionNumber": parseInt(file.revisionNumber, 10),
                    "content": file.content,
                    "contentType": file.contentType,
                    "properties": file.properties,
                    "extensions": extensions
                  });
                }
              });
              
            }
          }
        }
      });
    },
    
    closeSession: function (sessionId) {
      apiEvents.emit("sessionClose", {
        sessionId: sessionId
      });
    },
    
    on: function (event, listener) {
      apiEvents.on(event, listener);
    },
    
    removeListener: function (event, listener) {
      apiEvents.removeListener(event, listener);
    }
    
  };
  
}).call(this);