(function() {
  /* global CKEDITOR, CoOpsSessionEvents: true */
    
  CoOpsSessionEvents = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
      this._editor.on("CoOPS:SessionStart", this._onSessionStart, this);
    },
    proto : {
      
      _onSessionStart: function () {
        this._editor.on("CoOPS:PatchReceived", this._onPatchReceived, this, null, 9999);
      },

      _onPatchReceived: function (event) {
        var data = event.data;
        var sessionId = event.data.sessionId;
        
        if (data.extensions && data.extensions.sessionEvents) {
          for (var i = 0, l = data.extensions.sessionEvents.length; i < l; i++) {
            var sessionEvent = data.extensions.sessionEvents[i];
            switch (sessionEvent.status) {
              case 'OPEN':
                this._editor.fire("CoOPS:CollaboratorJoined", {
                  displayName: sessionEvent.displayName,
                  email: sessionEvent.email
                });
              break;
              case 'CLOSE':
                this._editor.fire("CoOPS:CollaboratorLeft", {
                  displayName: sessionEvent.displayName,
                  email: sessionEvent.email
                });
              break;
            }
          }
        }
      }
    }
  });
  
  CKEDITOR.plugins.add( 'coops-sessionevents', {
    requires: ['coops'],
    init: function( editor ) {
      editor.on('CoOPS:BeforeJoin', function(event) {
        /*jshint es5:false, nonew: false */
        new CoOpsSessionEvents(event.editor);
        /*jshint nonew: true */
      });
    }
  });

}).call(this);