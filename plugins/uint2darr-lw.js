(function() {
  
  var Canvas = require('canvas');
  var Image = Canvas.Image;
  var _ = require('underscore');

  exports.attach = function attach(options) {
    options.diffAlgorithms.push({
      
      patch: function(patch, data, properties) {
        var patchApplied = true;
        var patched = null;

        var patchJson = JSON.parse(patch);
        var width = patchJson.width;
        var height = patchJson.height;
          
        try {
          var canvas = new Canvas(width, height);
          var ctx = canvas.getContext('2d');
          var img = new Image();
          img.src = data.buffer;
          
          ctx.drawImage(img, 0, 0);
          
          var delta = patchJson.delta;
          var indices = _.keys(delta);
          
          for (var i = 0, l = indices.length; i < l; i++) {
            var key = indices[i];
            var index = parseInt(key, 10);
            var y = Math.floor(index / width);
            var x = index - (y * width);
            var v = delta[key];
            
            var r = (v & 4278190080) >>> 24;
            var g = (v & 16711680) >>> 16;
            var b = (v & 65280) >>> 8;
            var a = (v & 255) >>> 0;
  
            ctx.fillStyle = 'rgba(' + [r, g, b, a / 255].join(',') + ')';
            ctx.fillRect(x, y, 1, 1);
          }
          
          patched = canvas.toBuffer();
        } catch (e) {
          patchApplied = false;
        }
        
        return {
          applied: patchApplied && (patched != null),
          patchedText: patched
        };
      },
      
      getName: function () {
        return 'uint2darr-lw';
      }
      
    });
  };
  
  exports.init = function (done) {
    return done();
  };
  
}).call(this);