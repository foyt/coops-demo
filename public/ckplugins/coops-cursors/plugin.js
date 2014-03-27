(function() {
  /* global CKEDITOR, CoOpsCursors: true */
    
  CoOpsCursors = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
      this._colorIterator = 0;
      this._colors = this._createCursorColors(0.5, 64);
      
      this._editor.on("CoOPS:SessionStart", this._onSessionStart, this);
    },
    proto : {
      
      _onSessionStart: function () {
        this._editor.on("selectionChange", this._onSelectionChange, this);
        this._editor.document.on("mouseup", function () {
          this._checkSelection();
        }, this);
        this._editor.on("key", function () {
          this._checkSelection();
        }, this);
      },
      
      _onSelectionChange: function (event) {
        var selection = event.data.selection;
        var ranges = selection.getRanges();
        if (ranges.length > 0) {
          var selections = [];
          
          for ( var i = 0, l = ranges.length; i < l; i++) {
            var range = ranges[i];
            
            var startContainer = this._createXPath(range.startContainer);
            
            if (range.collapsed) {
              selections.push({
                collapsed: range.collapsed,
                startContainer: startContainer,
                startOffset: range.startOffset,
                endOffset: range.endOffset
              });
            } else {
              var endContainer = this._createXPath(range.endContainer);
              selections.push({
                collapsed: range.collapsed,
                startContainer: startContainer,
                startOffset: range.startOffset,
                endContainer: endContainer,
                endOffset: range.endOffset
              });
            }
          }
          
          this._pendingSelections = selections;
          if (!this._sendTimeout) {
            this._sendTimeout = CKEDITOR.tools.setTimeout(function() {
              this._editor.fire('CoOPS:ExtensionPatch', {
                extensions : {
                  ckcur : {
                    selections : this._pendingSelections
                  }
                }
              });
              
              this._pendingSelections = null;
              this._sendTimeout = null;
            }, this._sendInterval, this);
          }
        }
      },
      
      _checkSelection: function () {
        this._editor.forceNextSelectionCheck();
        this._editor.selectionChange();
      },

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
      },
      
      _findNodeByXPath : function(xpath) {
        var document = this._editor.document.$;
        var result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        return new CKEDITOR.dom.node(result.iterateNext());
      },
      
      _createXPath: function(node) {
        if (node.type === CKEDITOR.NODE_DOCUMENT) {
          return "/";
        } else {
          var parent = node.getParent();
          if (!parent) {
            return "/node()[" + (node.getIndex(true) + 1) + "]";
          } else {
            return this._createXPath(parent) + "/node()[" + (node.getIndex(true) + 1) + "]";
          }
        }
        
        return null;
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