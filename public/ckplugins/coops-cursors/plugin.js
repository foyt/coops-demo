(function() {
  /* global CKEDITOR, CoOpsCursors: true */
    
  CoOpsCursors = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
    },
    proto : {
      
    }
  });
  
  CKEDITOR.plugins.add( 'coops-cursors', {
    requires: ['coops'],
    init: function( editor ) {
      editor.on('CoOPS:BeforeJoin', function(event) {
        /*jshint es5:false, nonew: false */
        new CoOpsCursors();
        /*jshint nonew: true */
      });
    }
  });

}).call(this);