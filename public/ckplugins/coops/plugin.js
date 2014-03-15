(function() {
  /* global CKEDITOR */
  
  if (CKEDITOR.coops === undefined) {
    CKEDITOR.coops = {};
  }
  
  var PROTOCOL_VERSION = '1.0.0';
  
  CKEDITOR.coops.Feature = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
    },
    proto : {
      getEditor: function () {
        return this._editor;
      },
      getName: function () {
        return null;
      },
      getRequiredScripts: function () {
        return null;
      }
    }
  });
  
  CKEDITOR.coops.CoOps = CKEDITOR.tools.createClass({
    $: function(editor) {
      console.log("CoOps: " + editor.name)
      
      this._editor = editor;
      this._lastSelectionRanges = null;
      this._unsavedContent = null;
      this._savedContent = null;
      
      var algorithms = [];
      var connectors = [];
      var algorithmNames = [];
      var requiredScripts = [];
      
      var beforeJoinEvent = {
        addAlgorithm: function (algorithm) {
          algorithms.push(algorithm);
        },
        addConnector: function (connector) {
          connectors.push(connector);
        }
      };
      
      this._editor.on('contentChange', $.proxy(function(event) {
        this.setUnsavedContent(event.data.currentContent);
        this._editor.fire("CoOPS:ContentDirty");
      }, this));
    
      this._editor.on('CoOPS:SessionStart', $.proxy(function(event) {
        this.setSavedContent(this._editor.getData());
      }, this));

      this._editor.on('CoOPS:PatchAccepted', $.proxy(function(event) {
        this.setSavedContent(this._editor.getData());
      }, this));

      this._editor.on('CoOPS:ContentReverted', $.proxy(function(event) {
        this.setSavedContent(event.data.content);
      }, this));

      this._editor.on('CoOPS:PatchApplied', $.proxy(function(event) {
        this.setSavedContent(event.data.content);
      }, this));

      this._editor.on("CoOPS:Joined", $.proxy(function (event) {
        var content = event.data.content;
        
        this._editor.getChangeObserver().pause();
        this._editor.getSelection().removeAllRanges();
        
        var connected = false;
        var beforeStartEvent = {
          joinData: event.data,
          isConnected: function () {
            return connected;
          },
          markConnected: function () {
            connected = true;
          }
        };

        this._editor.fire("CoOPS:BeforeSessionStart", beforeStartEvent);

        if (beforeStartEvent.isConnected()) {
          this._editor.fire("CoOPS:SessionStart");
          this._editor.setData(content, function () {
            if (this.config.coops.readOnly !== true) {
              this.getChangeObserver().reset(content);
              this.getChangeObserver().resume();
              this.setReadOnly(false);
            }
          });
        } else {
          // TODO: Proper error handling
          alert('Could not connect...');
        }
      }, this));
      
      this._editor.fire("CoOPS:BeforeJoin", beforeJoinEvent);
      
      for (var i = 0, l = algorithms.length; i < l; i++) {
        algorithmNames.push(algorithms[i].getName());
      }
      
      this._editor.fire("CoOPS:Join", {
        protocolVersion: PROTOCOL_VERSION,
        algorithms: algorithmNames
      });
    },
    proto : {
      getEditor: function () {
        return this._editor;
      },
      isLocallyChanged: function () {
        return (this._unsavedContent != null) && (this._savedContent != null) && (this._unsavedContent != this._savedContent);
      },
      getUnsavedContent: function () {
        return this._unsavedContent;
      },
      getSavedContent: function () {
        return this._savedContent;
      },
      setUnsavedContent: function (unsavedContent) {
        this._unsavedContent = unsavedContent;
      },
      setSavedContent: function (savedContent) {
        this._unsavedContent = this._savedContent = savedContent;
      }
    }
  });
  
  CKEDITOR.plugins.add( 'coops', {
    requires: ['change'],
    onLoad : function() {
      CKEDITOR.tools.extend(CKEDITOR.editor.prototype, {
        getCoOps: function () {
          return this._coOps;
        }
      });
    },
    init: function( editor ) {
      editor.on( 'instanceReady', function(event) {
        console.log("instance: " + this .name);
        
        this._coOps = new CKEDITOR.coops.CoOps(this);
      });
    }
  });
  
}).call(this);