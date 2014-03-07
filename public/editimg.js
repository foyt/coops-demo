(function() {
  'use strict';
  
  $(document).ready(function() {
    $('<div>')
      .appendTo($('#image-container'))
      .CoIllusionist({
        image: $('.co-illusionist-image')
      });
    
    $('.co-illusionist-image').remove();
  });

}).call(this);