(function() {
  'use strict';

  $.widget("custom.CoIllusionistTool", {
    options : {},
    _create : function() {
      this.element
        .on("click", $.proxy(this._onClick, this))
        .addClass('co-illusionist-tool');
    },
    
    _onClick: function (event) {
      this.element.closest('.co-illusionist-toolbar').find('.co-illusionist-tool-selected').CoIllusionistTool("deactivate");
      this.activate();
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
    
    size: function (size) {
      if (size) {
        this._size = size;
      }
      
      return this._size;
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
        ctx.save();
        try {
          this._getCoIllusionist().CoIllusionist("clipSelection", ctx);
          ctx.beginPath();
          ctx.arc(data.screenX, data.screenY, this.size(), 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.closePath();
        } finally {
          ctx.restore();
        }
        
        done();
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
  
  $.widget("custom.CoIllusionistToolbar", {
    _create : function() {
      this.element.addClass('co-illusionist-toolbar');
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.CoIllusionist", {
    options : {
      image: null
    },
    _create : function() {
      this._mouseDown = false;
      this._selection = [0, 0, 0, 0];
      
      this.element.addClass('co-illusionist');
      
      var width = this.options.image.get(0).width;
      var height = this.options.image.get(0).height;
      
      this._screen = $('<canvas>')
        .addClass('co-illusionist-screen')
        .attr({ width: width, height: height })
        .on("mousedown", $.proxy(this._onMouseDown, this))
        .on("mouseup", $.proxy(this._onMouseUp, this))
        .on("mousemove", $.proxy(this._onMouseMove, this))
        .appendTo(this.element);
      
      this._offscreen = $('<canvas>')
        .hide()
        .addClass('co-illusionist-offscreen')
        .attr({ width: width, height: height })
        .appendTo(this.element);

      this.element.on("offscreen.beforedraw", $.proxy(this._onOffscreenBeforeDraw, this));
      this.element.on("offscreen.afterdraw", $.proxy(this._onOffscreenAfterDraw, this));
      this.element.on("screen.afterflip", $.proxy(this._onScreenAfterFlip, this));
      
      this._toolbar = $('<div>')
        .CoIllusionistToolbar()
        .append($('<div>').CoIllusionistToolPencil())
        .append($('<div>').CoIllusionistToolSelectRect())
        .appendTo(this.element);
      
      this.drawOffscreen($.proxy(function (ctx, done) {
        ctx.drawImage(this.options.image.get(0), 0, 0);
        done();
      }, this));
    },
    
    drawOffscreen: function (func) {
      if (func) {
        var ctx = this._offscreen.get(0).getContext("2d");
        this.element.trigger("offscreen.beforedraw");
        func(ctx, $.proxy(function () {
          this.element.trigger("offscreen.afterdraw");
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
      var clipWidth = this._selection[2] - this._selection[0];
      var clipHeight = this._selection[3] - this._selection[1];
        
      if ((clipWidth !== 0) && (clipHeight !== 0)) {
        ctx.beginPath();
        ctx.rect(this._selection[0], this._selection[1], clipWidth, clipHeight);
        ctx.clip();
      }
    },
    
    requestFlip: function () {
      this._flipToScreen();
    },
    
    selection: function (selection) {
      if (selection) {
        if (selection.length === 4) {
          this._selection = selection;
        } else if (selection.length === 2) {
          this._selection[2] = selection[0];
          this._selection[3] = selection[1];
        }
        
        this.element.trigger("selection.change", {
          selection: this._selection
        });
        
        this.requestFlip();
      }

      return this._selection;
    },

    _onOffscreenBeforeDraw: function () {

    },
    
    _onOffscreenAfterDraw: function () {
      this.requestFlip();
    },
    
    _flipToScreen: function () {
      this.element.trigger("screen.beforeflip");
      var ctx = this._screen.get(0).getContext("2d");
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
        var width = this._selection[2] - this._selection[0];
        var height = this._selection[3] - this._selection[1];
        
        var gradient = ctx.createLinearGradient(this._selection[0], this._selection[1], width, height);
        gradient.addColorStop("0", "rgba(0, 0, 0, 0.1)");
        gradient.addColorStop("1", "rgba(0, 0, 0, 1)");
        ctx.strokeStyle = gradient;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this._selection[0], this._selection[1], width, height);
        ctx.fillRect(this._selection[0], this._selection[1], width, height);
        done();
      }, this));
    },
    
    _destroy : function() {
    }
  });


}).call(this);