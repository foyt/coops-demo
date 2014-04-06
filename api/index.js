(function() {
  
  var crypto = require('crypto');
  var _ = require('underscore');
  var ObjectId = require('mongojs').ObjectId;
  var EventEmitter = require('events').EventEmitter;
  var async = require('async');
  var schedule = require('node-schedule');
  
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
  
  function getUserInfo(session, done) {
    if (session.userId) {
      db.users.findOne({_id: new ObjectId(session.userId.toString()) }, function(userErr, user) {
        if (userErr) {
          done("Error occurred while trying to find a session user: " + userErr, null);
        } else {
          if (user) {
            db.useremails.findOne({ userId: new ObjectId(user._id.toString()) }, function(userEmailErr, userEmail) {
              if (userEmailErr) {
                done("Error occurred while trying to find a session user email: " + userEmailErr, null);
              } else {
                if (userEmail) {
                  done(null, {
                    sessionId: session._id.toString(),
                    displayName: user.displayName||'Anonymous',
                    email: userEmail.address
                  });
                } else {
                  done(null, {
                    sessionId: session._id.toString(),
                    displayName: user.displayName||'Anonymous'
                  });
                }
              }
            });
          } else {
            done(null, {
              sessionId: session._id.toString(),
              displayName: 'Anonymous'
            });
          }
        }
      });
    } else {
      done(null, {
        sessionId: session._id.toString(),
        displayName: 'Anonymous'
      });
    }
  }
  
  function getUserInfos(file, done) {
    db.filesessions.find( { fileId: new ObjectId( file._id.toString() ) } , function (fileSessionErr, fileSessions) {
      if (fileSessionErr) {
        done(fileSessionErr, null);
      } else {
        var sessionIds = _.pluck(fileSessions, "sessionId").map(function (sessionId) {
          return new ObjectId(sessionId.toString());
        });
        
        db.sessions.find({ _id: { $in: sessionIds } }, function (sessionsErr, sessions) {
          if (sessionsErr) {
            done(sessionsErr, null);
          } else {
            async.map(sessions, getUserInfo, function (userInfoErr, userInfos) {
              done(userInfoErr, userInfos);
            });
          }
        });
      }
    });
  }
  
  var apiEvents = new EventEmitter();
  var api = {
      
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
    
    fileUpdate: function (sessionId, revisionNumber, fileId, done) {
      if (isNaN(revisionNumber)) {
        done("revisionNumber parameter is missing", 400, null);
        return;
      }

      if (!sessionId) {
        done("sessionId parameter is missing", 400, null);
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
                db.filesessions.update(
                  { fileId: new ObjectId(file._id.toString()), sessionId: new ObjectId(sessionId.toString()) },
                  { $set: { accessed: new Date().getTime() } }
                );
                
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
                  
                  apiEvents.emit("sessionOpen", {
                    "sessionId": session._id.toString(),
                    "userId": userId,
                    "fileId": fileId,
                    "algorithm": session.algorithm,
                    "revisionNumber": parseInt(file.revisionNumber, 10)
                  });
                  
                  getUserInfos(file, function (userInfosErr, infos) {
                    if (userInfosErr) {
                      done(userInfosErr, 500, null);
                    } else {
                      extensions.sessionEvents = _.map(infos, function (info) {
                        info.status = 'OPEN';
                        return info;
                      });
                      
                      done(null, 200, {
                        "sessionId": session._id.toString(),
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
              });
              
            }
          }
        }
      });
    },
    
    closeSession: function (fileId, sessionId) {
      apiEvents.emit("sessionClose", {
        fileId: fileId,
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
  
  function sendSessionEventsPatch(fileId, sessionId, status) {
    db.sessions.findOne({ _id: new ObjectId( sessionId.toString() ) }, function (sessionErr, session) {
      if (sessionErr) {
        console.log("Error occurred while trying to find a session: " + sessionErr);
      } else {
        if (session) {
          findFile(fileId, function (err, file) {
            if (err) {
              console.log("Error occurred while trying to find a session file: " + err);
            } else {
              if (file) {
                getUserInfo(session, function (err, info) {
                  info.status = status;
                  api.filePatch(file._id, {
                    sessionId: session._id.toString(),
                    revisionNumber: file.revisionNumber,
                    extensions: {
                      sessionEvents: [info]
                    }
                  }, function (err, code, file) {});
                });
                
              } else {
                console.log("Could not find a session file");
              }
            }
          });
        } else {
          console.log("Could not find a session");
        }
      }
    });
  }

  api.on("sessionOpen", function (data) {
    sendSessionEventsPatch(data.fileId, data.sessionId, "OPEN");
    db.filesessions.insert({
      fileId: new ObjectId(data.fileId),
      sessionId: new ObjectId(data.sessionId),
      accessed: new Date().getTime(),
      type: 'REST'
    });
  });
  
  api.on("sessionClose", function (data) {
    sendSessionEventsPatch(data.fileId, data.sessionId, "CLOSE");
    db.filesessions.remove({ sessionId: new ObjectId( data.sessionId.toString() )});
  });
  
  schedule.scheduleJob(new schedule.RecurrenceRule(null, null, null, null, null, null, [0, 15, 30, 45]), function() {
    db.filesessions.find( { accessed: { $lt: new Date().getTime() - (1000 * 10) }, type: 'REST' }, function (err, fileSessions) {
      if (!err) {
        fileSessions.forEach(function (fileSession) {
          apiEvents.emit("sessionClose", {
            fileId: fileSession.fileId.toString(),
            sessionId: fileSession.sessionId.toString()
          });
        });
      } else {
        console.log("Error occurred in scheduled filesession close check: " + err);
      }
    });
  });
  
  module.exports = api;
  
}).call(this);