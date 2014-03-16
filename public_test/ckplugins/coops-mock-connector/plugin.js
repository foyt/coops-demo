(function() {
  /* global CKEDITOR, hex_md5, MockConnectorConnector:true */
  
  function generateGUID() {
    return hex_md5(String(Math.random() * 10000));
  }
  
  CKEDITOR.plugins.add('coops-mock-connector', {
    requires : [ 'coops' ],
    init : function(editor) {
      
      MockConnectorConnector = CKEDITOR.tools.createClass({
        base : CKEDITOR.coops.Feature,
        $ : function(editor) {
          this.base(editor);
          
          editor._mock = this;
          editor.on('CoOPS:Join', this._onCoOpsJoin, this);
          editor.on("CoOPS:BeforeSessionStart", this._onBeforeSessionStart, this, null, 9999);
        },
        proto : {
          getName: function () {
            return 'mock-connector';
          },
          
          _onCoOpsJoin: function (event) {
            event.editor.fire("CoOPS:Joined", {
              sessionId: this._sessionId,
              algorithm: "dmp",
              revisionNumber: this._revisionNumber,
              content: '',
              contentType: "text/html;editor=CKEditor",
              properties: {},
              extensions: {}
            });
          },

          _onBeforeSessionStart : function(event) {
            if (!event.data.isConnected()) {
              this._revisionNumber = 0;
              this._sessionId = generateGUID();
              var joinData = event.data.joinData;
              event.data.markConnected();
            }
          }
        }
      });
      
      editor.on('CoOPS:BeforeJoin', function(event) {
        event.data.addConnector(new MockConnectorConnector(event.editor));
      });
    }
  });
  
}).call(this);