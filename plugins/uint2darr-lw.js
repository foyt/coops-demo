(function() {
  
  var Canvas = require('canvas');
  var Image = Canvas.Image;
  var _ = require('underscore');

  exports.attach = function attach(options) {
    options.diffAlgorithms.push({
      
      patch: function(patch, data, fileProperties, patchProperties, callback) {
        var content = data.buffer;
        var patchJson = patch ? JSON.parse(patch) : null;

        var newWidth = (patchProperties||{}).width||fileProperties.width;
        var newHeight = (patchProperties||{}).height||fileProperties.height;
        try {
          var canvas = new Canvas(fileProperties.width, fileProperties.height);
          var ctx = canvas.getContext('2d');
          var img = new Image();
          img.src = data.buffer;
          ctx.drawImage(img, 0, 0);
          
          if ((fileProperties.width != newWidth)||(fileProperties.height != newHeight)) {
            canvas.width = newWidth;
            canvas.height = newHeight;
          }
          
          if (patchJson) {
            var indices = _.keys(patchJson);
            
            for (var i = 0, l = indices.length; i < l; i++) {
              var key = indices[i];
              var index = parseInt(key, 10);
              var y = Math.floor(index / canvas.width);
              var x = index - (y * canvas.width);
              var v = patchJson[key];
              /*jslint bitwise: true */
              var r = (v & 4278190080) >>> 24;
              var g = (v & 16711680) >>> 16;
              var b = (v & 65280) >>> 8;
              var a = (v & 255) >>> 0;
              /*jslint bitwise: false */
              ctx.fillStyle = 'rgba(' + [r, g, b, a / 255].join(',') + ')';
              ctx.fillRect(x, y, 1, 1);
            }
          }
          
          content = canvas.toBuffer();
        } catch (e) {
          callback(e, null, null);
          return;
        }
        
        callback(null, content, patchProperties);
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