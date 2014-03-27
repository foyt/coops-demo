(function() {
  /* global CKEDITOR, CoOpsCursors: true */
    
  CoOpsCursors = CKEDITOR.tools.createClass({
    $: function(editor) {
      this._editor = editor;
      this._colorIterator = 0;
      this._colors = this._createCursorColors(0.5, 64);
      this._clientSelections = {};
      this._editor.on("CoOPS:SessionStart", this._onSessionStart, this);
    },
    proto : {
      
      _onSessionStart: function () {
        this._editor.on("selectionChange", this._onSelectionChange, this);
        this._editor.on("CoOPS:PatchReceived", this._onPatchReceived, this);
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
      
      _onPatchReceived: function (event) {
        var data = event.data;
        var sessionId = event.data.sessionId;

        var clientSelection = this._clientSelections[sessionId];
        if (!clientSelection) {
          clientSelection = this._clientSelections[sessionId] = {
            color: this._nextColor(),
            ranges: []
          };
        } else {
          clientSelection.ranges = [];
        }
        
        if (data.extensions && data.extensions.ckcur && data.extensions.ckcur.selections) {
          var selections = data.extensions.ckcur.selections;
          for (var i = 0, l = selections.length; i < l; i++) {
            var selection = selections[i];
            var startContainer = this._findNodeByXPath(selection.startContainer);
            var startOffset = selection.startOffset;
            var endOffset = selection.endOffset;
            
            try {
              var range = new CKEDITOR.dom.range( this._editor.document );
              range.setStart(startContainer, startOffset);
              
              if (selection.collapsed) {
                range.setEnd(startContainer, endOffset);
              } else {
                var endContainer = this._findNodeByXPath(selection.endContainer);
                range.setEnd(endContainer, endOffset);
              }
              
              clientSelection.ranges.push(range);
            } catch (e) {
              throw e;
            }
          }
        }
        
        this._drawClientSelections();
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
      },
      
      _createBoxes: function (range) {
        var verticalMargin = 0;
        var selectionBoxes = [];
        var nativeRange = this._editor.document.$.createRange();
        var boundingBox;
        
        if (range.collapsed) {
          nativeRange.setStart(range.startContainer.$, range.startOffset);
          nativeRange.setEnd(range.startContainer.$, range.endOffset);
          boundingBox = nativeRange.getBoundingClientRect();
          
          selectionBoxes.push({
            top: Math.floor(boundingBox.top - verticalMargin),
            left: Math.floor(boundingBox.left),
            width: 1,
            height: Math.ceil(boundingBox.height + (verticalMargin * 2))
          });
        } else {
          var walker = new CKEDITOR.dom.walker(range);
          walker.evaluator = function( node ) {
            return node.type === CKEDITOR.NODE_TEXT;
          };
          
          var node;
          while ((node = walker.next())) {
            if (node.equals(range.startContainer)) {
              nativeRange.setStart(node.$, range.startOffset);
            } else {
              nativeRange.setStartBefore(node.$);
            }
          
            if (node.equals(range.endContainer)) {
              nativeRange.setEnd(node.$, range.endOffset);
            } else {
              nativeRange.setEndAfter(node.$);
            }

            boundingBox = nativeRange.getBoundingClientRect();
            if (boundingBox.height > 0 && boundingBox.width > 0) {
              selectionBoxes.push({
                top: Math.floor(boundingBox.top - verticalMargin),
                left: Math.floor(boundingBox.left),
                width: Math.ceil(boundingBox.width),
                height: Math.ceil(boundingBox.height + (verticalMargin * 2))
              });
            }
          }
        }
        
        return selectionBoxes;
      },
      
      _drawClientSelections: function () {
        var clients = CKEDITOR.tools.objectKeys(this._clientSelections);
        var boxedSelections = [];
        
        for (var i = 0, l = clients.length; i < l; i++) {
          var clientSelection = this._clientSelections[clients[i]];
          for (j = clientSelection.ranges.length - 1; j >= 0; j--) {
            var range = clientSelection.ranges[j];
            if (!range.startContainer || !range.startContainer.$) {
              // Selection is no longer valid, so we drop it out
              clientSelection.ranges.splice(j, 1);
            } else {
              boxedSelections.push({
                color: clientSelection.color,
                boxes: this._createBoxes(clientSelection.ranges[j])
              });
            }
          }
        }
        
        var drawMode = (this._editor.config.coops.cursors||{}).drawMode;
        if (!drawMode) {
          drawMode = 'SVG';
        }
        
        switch (drawMode) {
          case 'SVG':
            var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>";
            for (var i = 0, l = boxedSelections.length; i < l; i++) {
              var boxedSelection = boxedSelections[i];
              for (var j = 0, jl = boxedSelection.boxes.length; j < jl; j++) {
                var box = boxedSelection.boxes[j];
                svg += '<rect x="' + box.left + '" y="' + box.top + '" width="' + box.width + '" height="' + box.height + '" style="fill:' + boxedSelection.color + '"/>';
              }
            }

            svg += '</svg>';
                      
            this._editor.document.getBody().setStyles({
              'background-image': 'url(data:image/svg+xml;base64,' + btoa(svg) + ')',
              'background-repeat': 'no-repeat',
              'background-position': 'top left'
            });
          break;
          case 'CANVAS':
            var canvasHeight = 0;
            var canvasWidth = 0;
            for (var i = 0, l = boxedSelections.length; i < l; i++) {
              var boxedSelection = boxedSelections[i];
              for (var j = 0, jl = boxedSelection.boxes.length; j < jl; j++) {
                var box = boxedSelection.boxes[j];
                canvasHeight = Math.max(canvasHeight, box.top + box.height);
                canvasWidth = Math.max(canvasWidth, box.left + box.width);
              }
            }
            
            if (!this._canvas) {
              this._canvas = document.createElement('canvas');
            }
            
            this._canvas.height = canvasHeight;
            this._canvas.width = canvasWidth;
            var ctx = this._canvas.getContext("2d");
            
            for (var i = 0, l = boxedSelections.length; i < l; i++) {
              var boxedSelection = boxedSelections[i];
              ctx.fillStyle = boxedSelection.color;
              for (var j = 0, jl = boxedSelection.boxes.length; j < jl; j++) {
                var box = boxedSelection.boxes[j];
                ctx.fillRect(box.left, box.top, box.width, box.height);
              }
            }
            
            this._editor.document.getBody().setStyles({
              'background-image': (canvasHeight > 0) && (canvasWidth > 0) ? 'url(' + this._canvas.toDataURL() + ')' : 'none',
              'background-repeat': 'no-repeat',
              'background-position': 'top left'
            });
          break;
        }
      },
      
      _drawBoxes: function (selectionBoxes) {
        var canvas = document.createElement('canvas');
        
        if (selectionBoxes.length > 0) {
          var canvasHeight = 0;
          var canvasWidth = 0;
          for (var i = 0, l = selectionBoxes.length; i < l; i++) {
            var selectionBox = selectionBoxes[i];
            canvasHeight = Math.max(canvasHeight, Math.ceil(selectionBox.top + selectionBox.height));
            canvasWidth = Math.max(canvasWidth, Math.ceil(selectionBox.left + selectionBox.width));
          }
          
          canvas.height = canvasHeight;
          canvas.width = canvasWidth;

          var ctx = canvas.getContext("2d");
     
          for (var j = 0, jl = selectionBoxes.length; j < jl; j++) {
            ctx.fillStyle = selectionBoxes[j].color;
            ctx.fillRect(Math.floor(selectionBoxes[j].left), Math.floor(selectionBoxes[j].top), Math.ceil(selectionBoxes[j].width), Math.ceil(selectionBoxes[j].height));
          }
        }
        
        this._editor.document.getBody().setStyles({
          'background-image': 'url(' + canvas.toDataURL() + ')',
          'background-repeat': 'no-repeat',
          'background-position': 'top left'
        });
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