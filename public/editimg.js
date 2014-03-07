(function() {
  'use strict';
  
  $(document).ready(function() {
    $('<div>')
      .appendTo($('#image-container'))
      .CoIllusionist({
        image: $('.co-illusionist-image'),
        trackChanges: true
      })
      .on('offscreen.change', function (event, data) {
        var delta = data.delta;
        var patch = {
          width: data.width,
          height: data.height,
          delta: {}
        };
        
        for (var i = 0, l = delta.length; i < l; i++) {
          patch.delta[delta[i].index] = delta[i].to;
        }
        
        var patchText = JSON.stringify(patch);
      });

      $('.co-illusionist-image').remove();
  });

}).call(this);