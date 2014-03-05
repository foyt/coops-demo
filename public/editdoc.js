(function() {
  
  $(document).ready(function() {
    var location = window.document.location;
    var path = location.pathname.split('/');
    var fileId = path[2];
    var serverUrl = '/files/' + fileId + '';
  
    CKEDITOR.plugins.addExternal('change', '/ckplugins/change/');
    CKEDITOR.plugins.addExternal('coops', '/ckplugins/coops/');
    CKEDITOR.plugins.addExternal('coops-rest', '/ckplugins/coops-rest/');
    CKEDITOR.plugins.addExternal('coops-dmp', '/ckplugins/coops-dmp/');
    CKEDITOR.plugins.addExternal('coops-ws', '/ckplugins/coops-ws/');
    CKEDITOR.plugins.addExternal('mrmonkey', '/ckplugins/mrmonkey/');
    
    var editor = CKEDITOR.appendTo( 'ckcontainer', { 
      skin: 'moono',
      extraPlugins: 'coops,coops-rest,coops-ws,coops-dmp,mrmonkey',
      readOnly: true,
      height: 500,
      coops: {
        serverUrl: serverUrl,
        websocket: {
          cursorsVisible: true,
          cursorAlpha: 0.9,
          cursorBlinks: true,
          cursorBlinkInterval: 1.2
        }
      }
    }, 'Content loading...');
    
    editor.on("CoOPS:WebSocketConnect", function (event) {
      $('.editor-status').html('Loaded');
    });
  
    editor.on("CoOPS:ContentDirty", function (event) {
      $('.editor-status').html('Unsaved');
    });
    
    editor.on("CoOPS:ContentPatch", function (event) {
      $('.editor-status').html('Saving...');
    });
    
    editor.on("CoOPS:PatchAccepted", function (event) {
      $('.editor-status').html('Saved');
    });
  });
  
}).call(this);