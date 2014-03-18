(function() {
  /* global CKEDITOR, ActiveXObject, MockConnector:true */
  
  CKEDITOR.plugins.add('coops-mock-connector', {
    requires : [ 'coops' ],
    init : function(editor) {
      
      MockConnector = CKEDITOR.tools.createClass({
        base : CKEDITOR.coops.Feature,
        $ : function(editor) {
          this.base(editor);
          
          editor.checkUpdates = $.proxy(function () {
            this._checkUpdates();
          }, this);
          
          editor.on('CoOPS:Join', this._onCoOpsJoin, this);
          editor.on("CoOPS:BeforeSessionStart", this._onBeforeSessionStart, this, null, 9999);
        },
        proto : {
          getName: function () {
            return 'mock-connector';
          },
          
          _onCoOpsJoin: function (event) {
            var protocolVersion = event.data.protocolVersion;
            var algorithms = event.data.algorithms;
            var editor = event.editor;
            
            this._fileJoin(algorithms, protocolVersion, CKEDITOR.tools.bind(function (status, responseJson, error) {
              if (error) {
                editor.fire("CoOPS:Error", {
                  type: "join",
                  error: error
                });
              } else {
                editor.fire("CoOPS:Joined", responseJson);
              }
            }, this));
          },

          _onBeforeSessionStart : function(event) {
            if (!event.data.isConnected()) {
              var joinData = event.data.joinData;

              this._revisionNumber = joinData.revisionNumber;
              this._sessionId = joinData.sessionId;

              this.getEditor().on("CoOPS:ContentPatch", this._onContentPatch, this);
              this.getEditor().on("CoOPS:ContentRevert", this._onContentRevert, this);
              this.getEditor().on("propertiesChange", this._onPropertiesChange, this);
              
              if (this.getEditor().config.autopoll) {
                this._startUpdatePolling();
              }

              event.data.markConnected();
            }
          },

          _onContentPatch : function(event) {
            if (this.getEditor().config.coops.readOnly === true) {
              return;
            }
            
            var patch = event.data.patch;
            this.getEditor().getChangeObserver().pause();
            
            this._doPatch(this._editor.config.coops.serverUrl, { patch: patch, revisionNumber : this._revisionNumber, sessionId: this._sessionId }, CKEDITOR.tools.bind(function (status, responseJson, responseText) {
              switch (status) {
                case 204:
                  // Request was ok
                break;
                case 409:
                  this.getEditor().fire("CoOPS:PatchRejected");
                break;
                default:
                  editor.fire("CoOPS:Error", {
                    type: "patch",
                    error: responseText
                  });
                break;
              }
              
            }, this));
          },
          
          _onPropertiesChange: function (event) {
            if (this.getEditor().config.coops.readOnly === true) {
              return;
            }

            this.getEditor().getChangeObserver().pause();
            
            var changedProperties = event.data.properties;
            var properties = {};
            
            for (var i = 0, l = changedProperties.length; i < l; i++) {
              properties[changedProperties[i].property] = changedProperties[i].currentValue;
            }
            
            this._doPatch(this._editor.config.coops.serverUrl, { properties: properties, revisionNumber : this._revisionNumber, sessionId: this._sessionId  }, CKEDITOR.tools.bind(function (status, responseJson, responseText) {
              switch (status) {
                case 204:
                  // Request was ok
                break;
                case 409:
                  this.getEditor().fire("CoOPS:PatchRejected");
                break;
                default:
                  editor.fire("CoOPS:Error", {
                    type: "patch",
                    error: responseText
                  });
                break;
              }
              
            }, this));
          },
          
          _onContentRevert: function(event) {
            this.getEditor().getChangeObserver().pause();
            
            this._doGet(this._editor.config.coops.serverUrl, { }, CKEDITOR.tools.bind(function (status, responseJson, responseText) {
              switch (status) {
                case 200:
                  // Content reverted

                  this.getEditor().getChangeObserver().reset();
                  this.getEditor().getChangeObserver().resume();
                  
                  var content = responseJson.content;
                  this._revisionNumber = responseJson.revisionNumber;

                  this.getEditor().fire("CoOPS:RevertedContentReceived", {
                    content: content
                  });
                break;
                default:
                  editor.fire("CoOPS:Error", {
                    type: "revert",
                    error: responseText
                  });
                break;
              }
              
            }, this));
          },
          
          _fileJoin: function (algorithms, protocolVersion, callback) {
            var parameters = [];
            for (var i = 0, l = algorithms.length; i < l; i++) {
              parameters.push({
                name: 'algorithm',
                value: algorithms[i]
              });
            }
            
            parameters.push({
              name: 'protocolVersion',
              value: protocolVersion
            });
          
            var url = this._editor.config.coops.serverUrl + '/join';
      
            this._doGet(url, parameters, callback);
          },
          
          _startUpdatePolling: function () {
            this._pollUpdates();
          },
          
          _stopUpdatePolling: function () {
            if (this._timer) {
              clearTimeout(this._timer);
            }

            this._timer = null;
          },
          
          _checkUpdates: function (callback) {
            var url = this._editor.config.coops.serverUrl + '/update';
            this._doGet(url, [ { name: "revisionNumber", value : this._revisionNumber } ], CKEDITOR.tools.bind(function (status, responseJson, responseText) {
              if (status === 200) {
                this._applyPatches(responseJson);
              } else {
                if ((status !== 204)||(status !== 304)) {
                  editor.fire("CoOPS:Error", {
                    type: "update",
                    error: responseText
                  });
                }
              }
              
              
            }, this));
          },
          
          _pollUpdates : function() {
            this._checkUpdates($.proxy(function () {
              this._timer = CKEDITOR.tools.setTimeout(this._pollUpdates, 500, this);
            }, this));
          },
          
          _applyPatches: function (patches) {
            var patch = patches.splice(0, 1)[0];
            this._applyPatch(patch, CKEDITOR.tools.bind(function () {
              if (patches.length > 0) {
                this._applyPatches(patches);
              }
            }, this));
          },
          
          _applyPatch: function (patch, callback) {
            /*jslint es5:false, eqeqeq: true */
            if (this._sessionId != patch.sessionId) {
              // Received a patch from other client
              if (this._editor.fire("CoOPS:PatchReceived", {
                patch : patch.patch,
                checksum: patch.checksum,
                revisionNumber: patch.revisionNumber,
                properties: patch.properties
              })) {
                this._revisionNumber = patch.revisionNumber;
                callback();
              }
            } else {
              // Our patch was accepted, yay!
              this._revisionNumber = patch.revisionNumber;

              this.getEditor().fire("CoOPS:PatchAccepted", {
                revisionNumber: this._revisionNumber
              });
            }
            /*jslint eqeqeq: false */
          },

          _doGet: function (url, parameters, callback) {
            this.getEditor().config.coops.mock.mockGetRequest(url, parameters, callback);
          },
          
          _doPost: function (url, object, callback) {
            this.getEditor().config.coops.mock.mockPostRequest(url, object, callback);
          },
          
          _doPut: function (url, object, callback) {
            this.getEditor().config.coops.mock.mockPutRequest(url, object, callback);
          },
          
          _doPatch: function (url, object, callback) {
            this.getEditor().config.coops.mock.mockPatchRequest(url, object, callback);
          },
          
          _doDelete: function (url, object, callback) {
            this.getEditor().config.coops.mock.mockDeleteRequest(url, object, callback);
          }
        }
      });
      
      editor.on('CoOPS:BeforeJoin', function(event) {
        event.data.addConnector(new MockConnector(event.editor));
      });

    }
  });
  
}).call(this);