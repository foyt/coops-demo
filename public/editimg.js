(function() {
  'use strict';
  
  $(document).ready(function() {
    
    var location = window.document.location;
    var path = location.pathname.split('/');
    var fileId = path[2];
    var serverUrl = '/files/' + fileId + '';
    
    var coIllusionist = $('<div>')
      .appendTo($('#image-container'))
      .CoIllusionist({
        trackChanges: true,
        serverUrl: serverUrl,
        debug: {
          showAffectedArea: false
        }
      });
    
    coIllusionist.on("sessionStart", function (event) {
      $('.editor-status').html('Loaded');
    });
    
    coIllusionist.on("patch", function (event) {
      $('.editor-status').html('Saving...');
    });
    
    coIllusionist.on("patched", function (event) {
      $('.editor-status').html('Saved');
    });
  });

}).call(this);