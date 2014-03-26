(function() {
  /* global CKEDITOR, CoOpsCursors: true */
    
  CoOpsCursors = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
      this._colorIterator = 0;
      this._colors = this._createCursorColors(0.5, 64);
    },
    proto : {

      _nextColor: function () {
        this._colorIterator = (this._colorIterator + 1) % this._colors.length;
        return 'rgba(' + this._colors[this._colorIterator].join(',') + ')';
      },
      
      _createCursorColors: function (alpha, step) {
        var colors = [];

        for ( var r = 255; r >= 0; r -= step) {
          for ( var g = 255; g >= 0; g -= step) {
            for ( var b = 255; b >= 0; b -= step) {
              r = Math.max(r, 0);
              g = Math.max(g, 0);
              b = Math.max(b, 0);

              if ((!(r === 0 && g === 0 && b === 0)) && (!(r === 255 && g === 255 && b === 255))) {
                colors.push([ r, g, b, alpha ]);
              }
            }
          }
        }

        colors.sort(function(a, b) {
          var ad = Math.abs(a[0] - a[1]) + Math.abs(a[1] - a[2]) + Math.abs(a[0] - a[2]);
          var bd = Math.abs(b[0] - b[1]) + Math.abs(b[1] - b[2]) + Math.abs(b[0] - b[2]);
          return bd - ad;
        });
        
        return colors;
      }
      
    }
  });
  
  CKEDITOR.plugins.add( 'coops-cursors', {
    requires: ['coops'],
    init: function( editor ) {
      editor.on('CoOPS:BeforeJoin', function(event) {
        /*jshint es5:false, nonew: false */
        new CoOpsCursors(event.editor);
        /*jshint nonew: true */
      });
    }
  });

}).call(this);