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
    CKEDITOR.plugins.addExternal('coops-ckcur', '/ckplugins/coops-ckcur/');
    CKEDITOR.plugins.addExternal('mrmonkey', '/ckplugins/mrmonkey/');
    
    var editor = CKEDITOR.appendTo( 'ckcontainer', {
      skin: 'moono',
      extraPlugins: 'coops,coops-rest,coops-dmp,mrmonkey,coops-ckcur',
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
    });
    
    /* CoOps status messages */
    
    editor.on("CoOPS:SessionStart", function (event) {
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
    
    $('input[name="name"]').change(function (event) {
      var oldValue = $(this).parent().data('old-value');
      var value = $(this).val();
      $(this).parent().data('old-value', value);
      
      editor.fire("propertiesChange", {
        properties : [{
          property: 'title',
          oldValue: oldValue,
          currentValue: value
        }]
      });
    });
    
    editor.on("CoOPS:PatchReceived", function (event) {
      var properties = event.data.properties;
      if (properties) {
        $.each(properties, function (key, value) {
          if (key === 'title') {
            $('input[name="name"]').val(value);
          }
        });
      }
    });
  });
  
}).call(this);