(function() {
  /* global CKEDITOR, DummyConnectorConnector:true */
  
  CKEDITOR.plugins.add('coops-dummy-connector', {
    requires : [ 'coops' ],
    init : function(editor) {
      
      DummyConnectorConnector = CKEDITOR.tools.createClass({
        base : CKEDITOR.coops.Feature,
        $ : function(editor) {
          this.base(editor);
          
          editor.mock = {
            sessionId: editor.config.coops.mock.sessionId,
            revisionNumber: editor.config.coops.mock.revisionNumber,
            content: editor.config.coops.mock.content,
            properties: editor.config.coops.mock.properties,
            extensions: editor.config.coops.mock.extensions
          };

          editor.on('CoOPS:Join', this._onCoOpsJoin, this);
          editor.on("CoOPS:BeforeSessionStart", this._onBeforeSessionStart, this, null, 9999);
        },
        proto : {
          getName: function () {
            return 'dummy-connector';
          },
          
          _onCoOpsJoin: function (event) {
            editor.fire("CoOPS:Joined", {
              sessionId: editor.mock.sessionId,
              algorithm: "dmp",
              revisionNumber: editor.mock.revisionNumber,
              content: editor.mock.content,
              contentType: "text/html;editor=CKEditor",
              properties: editor.mock.properties,
              extensions: editor.mock.extensions
            });
          },

          _onBeforeSessionStart : function(event) {
            if (!event.data.isConnected()) {
              var joinData = event.data.joinData;
              event.data.markConnected();
            }
          }
        }
      });
      
      editor.on('CoOPS:BeforeJoin', function(event) {
        event.data.addConnector(new DummyConnectorConnector(event.editor));
      });

    }
  });
  
}).call(this);