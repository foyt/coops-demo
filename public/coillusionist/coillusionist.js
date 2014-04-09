(function() {
  'use strict';
  
  /* global MozWebSocket  */
  
  function Rect2D(x, y, width, height) {
    this.val(x, y, width, height);
  }
  
  jQuery.extend(Rect2D.prototype, {
    val: function (x, y, width, height) {
      if (arguments.length === 4) {
        this.x(x);
        this.y(y);
        this.width(width);
        this.height(height);
      } else {
        return {
          x: this.x(),
          y: this.y(),
          width: this.width(),
          height: this.height()
        };
      }
    },
    x: function () {
      if (arguments.length === 1) {
        this._x = Math.floor(arguments[0]);
      }
      return this._x;
    },
    y: function () {
      if (arguments.length === 1) {
        this._y = Math.floor(arguments[0]);
      }
      return this._y;
    },
    width: function () {
      if (arguments.length === 1) {
        this._width = Math.max(0, Math.ceil(arguments[0]));
      }
      return this._width;
    },
    height: function () {
      if (arguments.length === 1) {
        this._height = Math.max(0, Math.ceil(arguments[0]));
      }
      return this._height;
    },
    x2: function () {
      if (arguments.length === 1) {
        this.width(arguments[0] - this.x());
      }
      return this.width() + this.x();
    },
    y2: function () {
      if (arguments.length === 1) {
        this.height(arguments[0] - this.y());
      }
      return this.height() + this.y();
    },
    empty: function () {
      return (this.width() === 0) && (this.height() === 0);
    },
    cut: function (r) {
      if (r.x() > this.x()) {
        this.width(this.width() - (r.x() - this.x()));
        this.x(r.x());
      }
      
      if (r.y() > this.y()) {
        this.height(this.height() - (r.y() - this.y()));
        this.y(r.y());
      }

      this.x2(Math.min(this.x2(), r.x2()));
      this.y2(Math.min(this.y2(), r.y2()));
    }
  });
  
  $.widget("custom.CoIllusionistTool", {
    options : {
      activatable: true
    },
    _create : function() {
      this.element
        .on("click", $.proxy(this._onClick, this))
        .addClass('co-illusionist-tool');
    },
    
    _onClick: function (event) {
      if (this.options.activatable) {
        this.element.closest('.co-illusionist-toolbar').find('.co-illusionist-tool-selected').CoIllusionistTool("deactivate");
        this.activate();
      }
    },
    
    activate: function () {
      this.element.addClass('co-illusionist-tool-selected');
      if (this.options.activate) {
        this.options.activate.call(this.element);
      }
    },
    
    deactivate: function () {
      this.element.removeClass('co-illusionist-tool-selected');
      if (this.options.deactivate) {
        this.options.deactivate.call(this.element);
      }
    },
    
    _destroy : function() {
    }
  });

  $.widget("custom.CoIllusionistToolLoad", {
    _create : function() {
      this.element
      .CoIllusionistTool({
        activate: $.proxy(this._onActivate, this)
      })
      .addClass('co-illusionist-tool-load');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },

    _onActivate: function () {
      this.element.CoIllusionistTool("deactivate");
      
      var dialog = $('<div>')
        .addClass('co-illusionist-tool-load-dialog')
        .attr('title', 'Load Image')
        .append($('<label>').text('URL:'))
        .append($('<input>').attr('name', 'url'))
        .dialog({
          modal: true,
          width: 500,
          buttons: {
            'Open': $.proxy(function () {
              this._loadImage($(dialog).find('input[name="url"]').val());
              $(dialog).dialog('close');
            }, this),
            'Cancel': function () {
              $(dialog).dialog('close');
            }
          }
        });
    },
    
    _loadImage: function (url) {
      var img = new Image();
      img.onload = $.proxy(function () {
        this._getCoIllusionist().CoIllusionist('loadImage', img);
      }, this);
      
      img.src = '/loadimg?src=' + encodeURIComponent(url);
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionistToolPencil", {
    _create : function() {
      this._size = 10;
      
      this._screenMouseDownListener = $.proxy(this._onScreenMouseDown, this);
      this._screenMouseDragListener = $.proxy(this._onScreenMouseDrag, this);
      
      this.element
        .CoIllusionistTool({
          activate: $.proxy(this._onActivate, this),
          deactivate: $.proxy(this._onDeactivate, this)
        })
        .addClass('co-illusionist-tool-pencil');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },
    
    _onActivate: function (event) {
      this._getCoIllusionist()
        .on("screen.mousedown", this._screenMouseDownListener)
        .on("screen.mousedrag", this._screenMouseDragListener);
    },
    
    _onDeactivate: function (event) {
      this._getCoIllusionist()
        .off("screen.mousedown", this._screenMouseDownListener)
        .off("screen.mousedrag", this._screenMouseDragListener);
    },
    
    _onScreenMouseDown: function (event, data) {
      
    },
    
    _onScreenMouseDrag: function (event, data) {
      this._getCoIllusionist().CoIllusionist("drawOffscreen", $.proxy(function (ctx, done) {
        var affectedArea = null;
        
        ctx.save();
        try {
          var size = this._getCoIllusionist().CoIllusionist('brush').size;
          var radius = size / 2;
          
          var selection = this._getCoIllusionist().CoIllusionist("clipSelection", ctx);
          this._getCoIllusionist().CoIllusionist("applyPaint", ctx);
          
          affectedArea = new Rect2D(data.screenX - radius, data.screenY - radius, size, size);
          if (selection && !selection.empty()) {
            affectedArea.cut(selection);
          }
          
          ctx.beginPath();
          ctx.arc(data.screenX, data.screenY, radius, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.closePath();
        } finally {
          ctx.restore();
        }
        
        done(affectedArea);
      }, this));
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionistToolSelectRect", {
    _create : function() {
      this._screenMouseDownListener = $.proxy(this._onScreenMouseDown, this);
      this._screenMouseDragListener = $.proxy(this._onScreenMouseDrag, this);
      
      this.element
        .CoIllusionistTool({
          activate: $.proxy(this._onActivate, this),
          deactivate: $.proxy(this._onDeactivate, this)
        })
        .addClass('co-illusionist-tool-select-rect');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },
    
    _onActivate: function (event) {
      this._getCoIllusionist()
        .on("screen.mousedown", this._screenMouseDownListener)
        .on("screen.mousedrag", this._screenMouseDragListener);
    },
    
    _onDeactivate: function (event) {
      this._getCoIllusionist()
        .off("screen.mousedown", this._screenMouseDownListener)
        .off("screen.mousedrag", this._screenMouseDragListener);
    },
    
    _onScreenMouseDown: function (event, data) {
      this._getCoIllusionist().CoIllusionist("selection", [data.screenX, data.screenY, data.screenX, data.screenY]);
    },
    
    _onScreenMouseDrag: function (event, data) {
      this._getCoIllusionist().CoIllusionist("selection", [data.screenX, data.screenY]);
    },
    
    _destroy : function() {
    }
  });

  $.widget("custom.CoIllusionistToolFilter", {
    _create : function() {
      this.element
      .CoIllusionistTool({
        activatable: false
      })
      .on("click", $.proxy(this._onClick, this))
      .addClass('co-illusionist-tool-filter');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },

    _onClick: function () {
      var filterSelect = $('<select>')
          .attr('name', 'filter');
      
      $.each({
        'blur': { text: 'Blur' },
        'desaturate': { text: 'Desaturate' },
        'edges': { text: 'Edge Detection' },
        'edges2': { text: 'Edge Detection 2' },
        'invert': { text: 'Invert' },
        'removenoise': { text: 'Remove Noise' },
        'sepia': { text: 'Sepia' },
        'solarize': { text: 'Solarize' } },
      $.proxy(function (filter, options) {
        $(this).append($('<option>').attr('value', filter).text(options.text));
      }, filterSelect));
      
      var dialog = $('<div>')
        .addClass('co-illusionist-tool-filter-dialog')
        .attr('title', 'Apply Filter')
        .append($('<label>').text('Apply filter:'))
        .append(filterSelect)
        .dialog({
          modal: true,
          buttons: {
            'Apply': $.proxy(function () {
              this._applyFilter($(dialog).find('select[name="filter"]').val());
              $(dialog).dialog('close');
            }, this),
            'Cancel': function () {
              $(dialog).dialog('close');
            }
          }
        });
    },
    
    _applyFilter: function (filter) {
      var coIllusionist = this._getCoIllusionist();
      
      coIllusionist.CoIllusionist("drawOffscreen", $.proxy(function (ctx, done) {
        var selection = coIllusionist.CoIllusionist("clipSelection", ctx);
        
        var options = {
          resultCanvas: ctx.canvas
        };
        
        if (selection && !selection.empty()) {
          options.rect = {
            "left" : selection.x(),
            "top" : selection.y(),
            "width" : selection.width(),
            "height" : selection.height()
          };
        }
        
        Pixastic.process(ctx.canvas, filter, options);
        done(selection);
      }, this));
    },
    
    _destroy : function() {
    }
  });

  $.widget("custom.CoIllusionistToolBrush", {
    _create : function() {
      this.element
      .CoIllusionistTool({
        activatable: false
      })
      .on('click', $.proxy(this._onClick, this))
      .addClass('co-illusionist-tool-brush');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },

    _onClick: function () {
      var brush = this._getCoIllusionist().CoIllusionist('brush');
      
      var sizeSlider = $('<div>')
        .slider({
          value: brush.size,
          min: 1,
          max: 100
        });
      
      var dialog = $('<div>')
        .addClass('co-illusionist-tool-brush-dialog')
        .attr('title', 'Brush Settings')
        .append($('<label>').text('Brush size:'))
        .append(
          $('<div>')
            .addClass('co-illusionist-tool-brush-size-container')
            .append($('<input>').attr({'name': 'size', 'size': '2'}).val(brush.size))
            .append(sizeSlider)
        )
        .dialog({
          modal: true,
          buttons: {
            'Apply': $.proxy(function () {
              this._apply($(dialog).find('input[name="size"]').val());
              $(dialog).dialog('close');
            }, this),
            'Cancel': function () {
              $(dialog).dialog('close');
            }
          }
        });
            
      sizeSlider.on('slide', function (event, ui) {
        dialog.find('input[name="size"]').val(ui.value);
      });
    },
    
    _apply: function (size) {
      this._getCoIllusionist().CoIllusionist('brush', {
        size: size
      });
    },
    
    _destroy : function() {
    }
  });

  $.widget("custom.CoIllusionistPaintButton", {
    options : {},
    _create : function() {
      this._paintType = this._pendingType = this.options.type;
      this._paintValue = this._pendingValue = this.options.value;
      this._paintPattern = this._pendingPattern = null;
      this._setPreviewStyle(this.options.type, this.options.value);
      
      this.element.addClass('co-illusionist-paintbar-button')
        .click($.proxy(this._onClick, this));
    },
    
    paint: function () {
      switch (this._paintType) {
        case 'color':
          return this._paintValue;
        case 'pattern':
          return this._paintPattern;
      }
    },
    
    _onClick: function (event) {
      this._dialog = $('<div>')
        .addClass('co-illusionist-paintdialog')
        .attr('title', 'Paint');
      var tabsElement = $('<div>');

      var prefix = new Date().getTime() + '-';
      var colorTabId = prefix + 'color';
      var patternTabId = prefix + 'pattern';

      this._tabLabels = $('<ul>');
      this._tabs = $('<div>');

      tabsElement.append(this._tabLabels);
      tabsElement.append(this._tabs);
      this._dialog.append(tabsElement);
      
      $('<li>').append($('<a>')
        .text('Color')
        .attr('href', '#' + colorTabId))
        .appendTo(this._tabLabels);
      
      $('<li>').append(
        $('<a>')
          .text('Pattern')
          .attr('href', '#' + patternTabId))
          .appendTo(this._tabLabels);

      var colorTabContent = $('<div>')
        .attr('id', colorTabId)
        .appendTo(tabsElement);
      
      var patternTabContent = $('<div>')
        .attr('id', patternTabId)
        .appendTo(tabsElement);
      
      patternTabContent.append($('<div>').addClass('co-illusionist-paintdialog-patterns'));
      
      tabsElement.tabs();
      this._dialog.dialog({
        resizable: false,
        modal: true,
        buttons: {
          "Ok": $.proxy(function () {
            this._applyPaint();
            $(this._dialog).dialog("close");
          }, this),
          "Cancel": $.proxy(function () {
            this._cancelPaint();
            $(this._dialog).dialog("close");
          }, this)
        }
      });
      
      var color = this._paintType === 'color' ? this._paintValue : '#000';
      var colorInput = $('<input>').appendTo(colorTabContent).val(color);
      $('<div>')
        .addClass('co-illusionist-paintdialog-preview')
        .append($('<span>')
          .css({
            'backgroundColor': color,
            'backgroundImage': 'none'
          })
        )
        .appendTo(colorTabContent);
      
      colorInput.spectrum({
        flat: true,
        showInput: false,
        showButtons: false,
        showAlpha: true,
        clickoutFiresChange: true,
        move: $.proxy(function(color) {
          this._setPaint(true, 'color', color.toRgbString());
        }, this)
      });
      
      $.ajax('/patterns/', {
        success: $.proxy(function (data, textStatus, jqXHR) {
          for (var i = 0, l = data.length; i < l; i++) {
            var path = data[i].path;
            var name = data[i].name;
            
            $('<div>')
              .addClass('co-illusionist-paintdialog-pattern')
              .data('path', path)
              .append($('<img>')
                .attr('src', path)
                .attr('title', name)
                .click($.proxy(this._onPatternClick, this))
              )
              .appendTo(patternTabContent.find('.co-illusionist-paintdialog-patterns'));
          }
        }, this)
      });
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },
    
    _cancelPaint: function () {
      this._setPaint(false, this._paintType, this._paintValue);
    },

    _applyPaint: function () {
      this._setPaint(false, this._pendingType, this._pendingValue);
    },
    
    _setPaint: function (pending, type, value) {
      switch (type) {
        case 'color':
          if (pending) {
            this._pendingType = type;
            this._pendingValue = value;
            this._pendingPattern = null;
          } else {
            this._paintType = type;
            this._paintValue = value;
            this._paintPattern = null;
          }
          
          this._dialog.find('span').css("backgroundColor", value);
        break;
        case 'pattern':
          var image = new Image();
          image.onload = $.proxy(function () {
            if (pending) {
              this._pendingType = type;
              this._pendingValue = value;
              this._pendingPattern = this._getCoIllusionist().CoIllusionist("createPattern", image);
            } else {
              this._paintType = type;
              this._paintValue = value;
              this._paintPattern = this._getCoIllusionist().CoIllusionist("createPattern", image);
            }
            
            this._dialog.find('span').css("backgroundColor", '#000');
          }, this);
          
          image.src = value;
        break;
      }
      
      this._setPreviewStyle(type, value);
    },
    
    _setPreviewStyle: function (type, value) {
      switch (type) {
        case 'color':
          this.element.css({
            'backgroundColor': value,
            'backgroundImage': 'none'
          });
        break;
        case 'pattern':
          this.element.css({
            'backgroundColor': null,
            'backgroundImage': 'url(' + value + ')'
          });
        break;
      }
    },
    
    _onPatternClick: function (event) {
      this._setPaint(true, 'pattern', $(event.target).attr('src'));
    },

    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionistPaintBar", {
    _create : function() {
      this._fill = $('<div>').CoIllusionistPaintButton({
        'type': 'color',
        'value': 'rgba(0, 0, 0, 1)'
      });
      
      this._stroke = $('<div>').CoIllusionistPaintButton({
        'type': 'color',
        'value': 'rgba(255, 255, 255, 0)'
      });
      
      this.element.addClass('co-illusionist-paintbar')
        .append($('<div>').addClass('co-illusionist-paintbar-button-container').append(this._fill))
        .append($('<div>').addClass('co-illusionist-paintbar-button-container').append(this._stroke));
    },
    
    apply: function (context) {
      context.strokeStyle = this._stroke.CoIllusionistPaintButton('paint');
      context.fillStyle = this._fill.CoIllusionistPaintButton('paint');
    },
    
    _getCoIllusionist: function () {
       return this.element.closest('.co-illusionist');
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionistToolbar", {
    _create : function() {
      this.element.addClass('co-illusionist-toolbar');
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionist", {
    options : {
      image: null,
      trackChanges: false,
      serverUrl: null,
      maxPatchDelta: 1024,
      debug: {
        showAffectedArea: false
      }
    },
    _create : function() {
      this._mouseDown = false;
      this._selection = new Rect2D(0, 0, 0, 0);
      this._currentdata = null;
      this._brush = {
        size: 10
      };
      
      this.element.addClass('co-illusionist');
      
      this._screen = $('<canvas>')
        .addClass('co-illusionist-screen')
        .on("mousedown", $.proxy(this._onMouseDown, this))
        .on("mouseup", $.proxy(this._onMouseUp, this))
        .on("mousemove", $.proxy(this._onMouseMove, this))
        .appendTo(this.element);
      
      this._offscreen = $('<canvas>')
        .hide()
        .addClass('co-illusionist-offscreen')
        .appendTo(this.element);

      this.element.on("offscreen.beforedraw", $.proxy(this._onOffscreenBeforeDraw, this));
      this.element.on("offscreen.afterdraw", $.proxy(this._onOffscreenAfterDraw, this));
      this.element.on("screen.afterflip", $.proxy(this._onScreenAfterFlip, this));
      
      this._toolbar = $('<div>')
        .CoIllusionistToolbar()
        .append($('<div>').CoIllusionistToolLoad())
        .append($('<div>').CoIllusionistToolPencil())
        .append($('<div>').CoIllusionistToolSelectRect())
        .append($('<div>').CoIllusionistToolFilter())
        .append($('<div>').CoIllusionistToolBrush())
        .appendTo(this.element);
      
      this.element.append($('<div>').CoIllusionistPaintBar());
      
      if (this.options.image) {
        this.loadImage(this.options.image, true);
      }
      
      if (this.options.serverUrl) {
        $(this.element).CoIllusionistCoOPS({
          serverUrl: this.options.serverUrl,
          maxPatchDelta: this.options.maxPatchDelta
        });
      }
    },
    
    loadImage: function (image, resetChanges) {
      var width = image.width;
      var height = image.height;
      var nativeOffscreen = this._offscreen.get(0);
      
      if ((nativeOffscreen.width !== image.width) || (nativeOffscreen.height !== image.height)) {
        var data = {};
        
        if (nativeOffscreen.width !== image.width) {
          data.width = image.width;
        }
        
        if (nativeOffscreen.height !== image.height) {
          data.height = image.height;
        }
        
        this._offscreen.attr(data);
        this._screen.attr(data);
        this.element.trigger("offscreen.resize", data);
      }
      
      this.drawOffscreen($.proxy(function (ctx, done) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(image, 0, 0);
        if (this.options.trackChanges && resetChanges) {
          this.resetChanges();
        }
        done();
      }, this));
    },
    
    resizeCanvas: function (width, height, triggerEvent) {
      var nativeOffscreen = this._offscreen.get(0);
      
      width = width||nativeOffscreen.width;
      height = height||nativeOffscreen.height;
      
      if ((nativeOffscreen.width !== width) || (nativeOffscreen.height !== height)) {
        var data = {};
        if (nativeOffscreen.width !== width) {
          data.width = width;
        }

        if (nativeOffscreen.height !== height) {
          data.height = height;
        }
        
        this._offscreen.attr(data);
        this._screen.attr(data);
        
        if (triggerEvent !== false) {
          this.element.trigger("offscreen.resize", data);
        }
      }
    },
    
    drawOffscreen: function (func) {
      if (func) {
        var nativeOffscreen = this._offscreen.get(0);
        var ctx = nativeOffscreen.getContext("2d");
        this.element.trigger("offscreen.beforedraw");
        func(ctx, $.proxy(function (affectedArea) {
          if (affectedArea && !affectedArea.empty()) {
            affectedArea.cut(new Rect2D(0, 0, nativeOffscreen.width, nativeOffscreen.height));
          }
          
          this.element.trigger("offscreen.afterdraw", {
            affectedArea: affectedArea
          });
        }, this));
      }
    },
    
    drawScreen: function (func) {
      if (func) {
        var ctx = this._screen.get(0).getContext("2d");
        this.element.trigger("screen.beforedraw");
        func(ctx, $.proxy(function () {
          this.element.trigger("screen.afterdraw");
        }, this));
      }
    },
    
    clipSelection: function (ctx) {
      var clipWidth = this._selection.width();
      var clipHeight = this._selection.height();
        
      if ((clipWidth !== 0) && (clipHeight !== 0)) {
        ctx.beginPath();
        ctx.rect(this._selection.x(), this._selection.y(), clipWidth, clipHeight);
        ctx.clip();
      }
      
      return this._selection;
    },
    
    applyPaint: function (ctx) {
      $(this.element).find('.co-illusionist-paintbar').CoIllusionistPaintBar('apply', ctx);
    },
    
    requestFlip: function () {
      this._flipToScreen();
    },
    
    selection: function (selection) {
      if (selection) {
        if (selection.length === 4) {
          this._selection.val(selection[0], selection[1], selection[2] - selection[0], selection[3] - selection[1]);// = new Rect2D(selection[0], selection[1], selection[0] + selection[2], selection[1] + selection[3]);
        } else if (selection.length === 2) {
          this._selection.x2(selection[0]);
          this._selection.y2(selection[1]);
        }
        
        this.element.trigger("selection.change", {
          selection: this._selection
        });
        
        this.requestFlip();
      }

      return this._selection;
    },
    
    brush: function (brush) {
      if (brush) {
        $.each(brush, $.proxy(function (key, value) {
          this._brush[key] = value;
        }, this));
      }
      
      return this._brush;
    },
    
    createPattern: function (image) {
      var ctx = this._offscreen.get(0).getContext("2d");
      return ctx.createPattern(image, "repeat");
    },
    
    data: function (area) {
      var ctx = this._offscreen.get(0).getContext("2d");
      var x = area ? area.x() : 0;
      var y = area ? area.y() : 0;
      var width = area ? area.width() : this._offscreen.get(0).width;
      var height = area ? area.height() : this._offscreen.get(0).height;

      return ctx.getImageData(x, y, width, height);
    },
    
    resetChanges: function () {
      this._currentData = this._rpgsToIntArr(this.data().data);
    },
    
    _rpgsToIntArr: function (rgbas) {
      /*jslint bitwise: true */
      var ints = new Array(rgbas.length >> 2);
      for (var i = 0, l = rgbas.length; i < l; i += 4) {
        ints[i >> 2] = ((rgbas[i] << 24) + (rgbas[i + 1] << 16) + (rgbas[i + 2] << 8) + (rgbas[i + 3] << 0)) >>> 0;
      }
      /*jslint bitwise: false */
      return ints;
    },

    _onOffscreenBeforeDraw: function () {

    },
    
    _onOffscreenAfterDraw: function (event, data) {
      this.requestFlip();
      
      if (this.options.trackChanges) {
        var delta = null;
        var width = null;
        var height = null;
        
        if (!data.affectedArea || data.affectedArea.empty()) {
          var imageData = this.data();
          var currentData = this._rpgsToIntArr(imageData.data);
          delta = this._diffImageData(this._currentData, currentData);
          this._currentData = currentData;
          width = imageData.width;
          height = imageData.height;
        } else {
          if (this.options.debug && this.options.debug.showAffectedArea) {
            var ctx = this._screen.get(0).getContext("2d");
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(data.affectedArea.x(), data.affectedArea.y(), data.affectedArea.width(), data.affectedArea.height());
          }
          
          if (!data.affectedArea.empty()) {
            var areaImageData = this.data(data.affectedArea);
            var areaData = this._rpgsToIntArr(areaImageData.data);
            width = this._offscreen.get(0).width;
            height = this._offscreen.get(0).height;
            delta = [];
            
            for (var x = 0, w = data.affectedArea.width(); x < w; x++) {
              for (var y = 0, h = data.affectedArea.height(); y < h; y++) {
                var areaIndex = x + (y * w);
                var dataIndex = (x + data.affectedArea.x()) + ((y + data.affectedArea.y()) * width);
                var d1 = this._currentData[dataIndex];
                var d2 = areaData[areaIndex];
                if (d1 !== d2) {
                  delta.push({ index: dataIndex, from: d1, to: d2 });
                  this._currentData[dataIndex] = d2;
                }
              }
            }
          }
        }

        if ((delta !== null) && (delta.length > 0)) {
          this.element.trigger("offscreen.change", {
            delta: delta,
            width: width,
            height: height
          });
        }
      }
    },
    
    _diffImageData: function (data1, data2) {
      var delta = [];
      
      for (var i = 0; i < data1.length; i++) {
        var d1 = data1[i];
        var d2 = data2[i];
        
        if (d1 !== d2) {
          delta.push({ index: i, from: d1, to: d2 });
        }
      }
      
      return delta;
    },

    _flipToScreen: function () {
      this.element.trigger("screen.beforeflip");
      var nativeScreen = this._screen.get(0);
      var ctx = nativeScreen.getContext("2d");
      ctx.clearRect(0, 0, nativeScreen.width, nativeScreen.height);
      ctx.drawImage(this._offscreen.get(0), 0, 0);
      this.element.trigger("screen.afterflip");
    },
    
    _onMouseDown: function (e) {
      var offset = this._screen.offset();
      
      this.element.trigger("screen.mousedown", {
        originalEvent: e,
        screenX: e.pageX - offset.left,
        screenY: e.pageY - offset.top,
      });
      
      this._mouseDown = true;
    },
    
    _onMouseUp: function (e) {
      var offset = this._screen.offset();
      
      this.element.trigger("screen.mouseup", {
        originalEvent: e,
        screenX: e.pageX - offset.left,
        screenY: e.pageY - offset.top,
      });
      
      this._mouseDown = false;
    },
    _onMouseMove: function (e) {
      var offset = this._screen.offset();
      
      this.element.trigger("screen.mousemove", {
        originalEvent: e,
        screenX: e.pageX - offset.left,
        screenY: e.pageY - offset.top,
      });
      
      if (this._mouseDown) {
        this.element.trigger("screen.mousedrag", {
          originalEvent: e,
          screenX: e.pageX - offset.left,
          screenY: e.pageY - offset.top,
        });
      }
    },
    
    _onScreenAfterFlip: function (event, data) {
      this.drawScreen($.proxy(function (ctx, done) {
        var x = this._selection.x();
        var y = this._selection.y();
        var width = this._selection.width();
        var height = this._selection.height();
        
        var gradient = ctx.createLinearGradient(x, y, width, height);
        gradient.addColorStop("0", "rgba(0, 0, 0, 0.1)");
        gradient.addColorStop("1", "rgba(0, 0, 0, 1)");
        ctx.strokeStyle = gradient;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        ctx.fillRect(x, y, width, height);
        done();
      }, this));
    },
    
    _destroy : function() {
    }
  });


  $.widget("custom.CoIllusionistCoOPS", {
    options: {
      serverUrl: null,
      autoJoin: true,
      algorithm: "uint2darr-lw",
      protocolVersion: "1.0.0",
      updateInterval: 200,
      maxPatchDelta: 1024
    },
    _create : function() {
      this._timer = null;
      this._patches = [];
      this._patching = false;
      this._patchingPaused = false;
      this._webSocket = null;
      
      this.element.on("join", $.proxy(this._onJoin, this));
      
      if (this.options.autoJoin) {
        this.join();
      }
    },
    
    join: function () {
      // TODO: Proper error handling...
      
      $.ajax(this.options.serverUrl + '/join', {
        data: {
          'algorithm': this.options.algorithm,
          'protocolVersion': this.options.protocolVersion
        },
        success: $.proxy(function (data) {
          this.element.trigger("join", data);
        }, this)
      });
    },
    
    addPatch: function (delta, properties) {
      var patchSize = 0;
      if (delta) {
        $.each(delta, function(key, value) {
          patchSize++;
        });
      }
      
      this._addPatch(delta, properties, patchSize);
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
    
    _addPatch: function (delta, properties, patchSize) {
      this._patches.push({
        delta: delta,
        properties: properties,
        patchSize: patchSize
      });
      
      if (this._patching === false) {
        this.element.trigger("patch");
        this._patching = true;
        this._sendNextPatch();
      }
    },
    
    _sendNextPatch: function () {
      if (this._patchingPaused) {
        return;
      }
      
      if (this._patches.length === 0) {
        this._patching = false;
        this.element.trigger("patched");
      } else {
        this._pausePatching();
        
        var patchData = this._mergePatches();
        var patch = patchData.delta ? JSON.stringify(patchData.delta) : null;

        if (this._webSocket) {
          this._webSocket.send(JSON.stringify({
            type: 'patch',
            data: { patch: patch, properties: patchData.properties, revisionNumber : this._revisionNumber, sessionId: this._sessionId }
          }));
        } else {
          // TODO: Proper error handling
          $.ajax(this.options.serverUrl, {
            data: {
              patch: patch,
              properties: patchData.properties,
              sessionId: this._sessionId,
              revisionNumber: this._revisionNumber
            },
            type: 'PATCH',
            accept: 'application/json',
            complete: $.proxy(function (jqXHR) {
              if (jqXHR.status !== 204) {
                if (jqXHR.status === 409) {
                  this.element.trigger('patchRejected', {
                    reason: jqXHR.responseText
                  });
                } else {
                  // TODO: Proper error handling
                  alert('Patching failed: ' + jqXHR.responseText);
                }
              }
            }, this)
          });
        }
      }
    },
    
    _mergePatches: function () {
      if (this._patches.length === 1) {
        return this._patches[0];
      }
      
      var deltaMerge = $.proxy(function (key, value) {
        this._patches[0].delta[key] = value;
      }, this);
      
      while (this._patches.length > 1) {
        var patch = this._patches[1];
        if ((!patch.properties) && ((patch.patchSize + this._patches[0].patchSize) <= this.options.maxPatchDelta)) {
          $.each(patch.delta, deltaMerge);
          this._patches[0].patchSize += patch.patchSize;
          this._patches.splice(1, 1);
        } else {
          return this._patches[0];
        }
      }
      
      return this._patches[0];
    },
    
    _pausePatching: function () {
      this._patchingPaused = true;
    },
    
    _resumePatching: function () {
      this._patchingPaused = false;
      if (this._patching === true) {
        this._sendNextPatch();
      }
    },
    
    _applyPatches: function (patches) {
      for (var i = 0, l = patches.length; i < l; i++) {
        this._applyPatch(patches[i]);
      }
    },
    
    _applyPatch: function (patch) {
      if (this._sessionId != patch.sessionId) {
        // Received a patch from other client
        
        if (patch.properties) {
          if (patch.properties.width||patch.properties.height) {
            $(this.element).CoIllusionist("resizeCanvas", patch.properties.width, patch.properties.height, false);
          }
        }

        if (patch.patch) {
          var patchJson = JSON.parse(patch.patch);
          
          $(this.element).CoIllusionist("drawOffscreen", $.proxy(function (ctx, done) {
            var width = ctx.canvas.width;
            
            $.each(patchJson, function (key, value) {
              var index = parseInt(key, 10);
              var y = Math.floor(index / width);
              var x = index - (y * width);
              var v = patchJson[key];
              /*jslint bitwise: true */
              var r = (v & 4278190080) >>> 24;
              var g = (v & 16711680) >>> 16;
              var b = (v & 65280) >>> 8;
              var a = (v & 255) >>> 0;
              /*jslint bitwise: false */
              ctx.fillStyle = 'rgba(' + [r, g, b, a / 255].join(',') + ')';
              ctx.fillRect(x, y, 1, 1);
            });
  
            $(this.element).CoIllusionist("resetChanges");
            done();
          }, this));
        }
        
        this.element.trigger("patchReceived", patch);
        
        this._revisionNumber = patch.revisionNumber;
      } else {
        // Our patch was accepted, yay!
        this._revisionNumber = patch.revisionNumber;
        this.element.trigger("patchAccepted", patch);
      }
    },
    
    _pollUpdates : function(event) {
      // TODO: Proper error handling
      $.ajax(this.options.serverUrl + '/update?sessionId=' + this._sessionId + '&revisionNumber=' + this._revisionNumber, {
        complete: $.proxy(function (jqXHR) {
          setTimeout($.proxy(this._pollUpdates, this), this.options.updateInterval);
          
          switch (jqXHR.status) {
            case 200:
              this._applyPatches(jqXHR.responseJSON);
            break;
            case 204:
            case 304:
              // Not modified
            break;
          }
        }, this)
      });
    },
    
    _openWebSocket: function (url) {
      if ((typeof window.WebSocket) !== 'undefined') {
        return new WebSocket(url);
      } else if ((typeof window.MozWebSocket) !== 'undefined') {
        return new MozWebSocket(url);
      }
      
      return null;
    },
    
    _onJoin: function (event, data) {
      this._revisionNumber = parseInt(data.revisionNumber, 10);
      this._sessionId = data.sessionId;
      
      var contentType = data.contentType;
      var extensions = data.extensions;

      var img = new Image();
      img.onload = $.proxy(function () {
        $(this.element).CoIllusionist('loadImage', img, true);
        this.element.on('offscreen.change', $.proxy(this._onOffscreenChange, this));
        this.element.on('offscreen.resize', $.proxy(this._onOffscreenResize, this));
        this.element.on('patchRejected', $.proxy(this._onPatchRejected, this));
        this.element.on('patchAccepted', $.proxy(this._onPatchAccepted, this));
        
        if (extensions.webSocket) {
          var secure = window.location.protocol.indexOf('https') === 0;
          var webSocketUrl = secure ? extensions.webSocket.wss : extensions.webSocket.ws;
          if (webSocketUrl) {
            this._webSocket = this._openWebSocket(webSocketUrl);
            this._webSocket.onmessage = $.proxy(this._onWebSocketMessage, this);
            this._webSocket.onclose = $.proxy(this._onWebSocketClose, this);
          }
        }
        
        if (!this._webSocket) {
          this._startUpdatePolling();
        }
        
        this.element.trigger('sessionStart');
      }, this);
      
      img.src = 'data:' + contentType + ';base64,' + data.content;
    },
    
    _onWebSocketMessage: function (event) {
      var message = JSON.parse(event.data);
      if (message && message.type) {
        switch (message.type) {
          case 'update':
            if (message.data) {
              this._applyPatch(message.data);
            }
          break;
          case 'patchRejected':
            this.element.trigger('patchRejected', {
              reason: message.data.message
            });
          break;
          case 'patchError':
            // TODO: Proper error handling
            alert("Received a patch error: " + message.data.message);
          break;
          default:
            // TODO: Proper error handling
            alert("Unknown WebSocket message " + message.type + ' received');
          break;
        }
      } else {
        // TODO: Proper error handling
        alert("Invalid WebSocket message received");
      }
    },
    
    _onWebSocketClose: function (event) {
      // TODO: Add reconnect...
    },
    
    _onOffscreenChange: function (event, data) {
      var delta = data.delta;
      var deltaLength = delta.length;
      var patch = {};
      var changed = false;
      var i = 0;
      var patchSize = 0;
      
      while (i < deltaLength) {
        if (patchSize >= this.options.maxPatchDelta) {
          this._addPatch(patch, null, patchSize);
          patch = {};
          patchSize = 0;
        }
        
        patch[delta[i].index] = delta[i].to;
        patchSize++;
        i++;
      }
      
      if (patchSize > 0) {
        this._addPatch(patch, null, patchSize);
      }
    },
    
    _onOffscreenResize: function (event, data) {
      this._addPatch(null, {
        width: data.width,
        height: data.height
      }, 0);
    },
    
    _onPatchRejected: function (event, data) {
      this._resumePatching();
    },
    
    _onPatchAccepted: function () {
      this._patches.splice(0, 1);
      this._resumePatching();
    },
    
    _destroy : function() {
    }
  });

}).call(this);