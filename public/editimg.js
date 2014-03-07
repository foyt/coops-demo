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
        console.log(data.delta);
      });

    $('.co-illusionist-image').remove();
  });

}).call(this);