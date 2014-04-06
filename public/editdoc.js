(function() {
  
  /* global CKEDITOR */
  
  $(document).ready(function() {
    var location = window.document.location;
    var path = location.pathname.split('/');
    var fileId = path[2];
    var serverUrl = '/files/' + fileId + '';
  
    CKEDITOR.plugins.addExternal('change', '/ckplugins/change/');
    CKEDITOR.plugins.addExternal('coops', '/ckplugins/coops/');
    CKEDITOR.plugins.addExternal('coops-connector', '/ckplugins/coops-connector/');
    CKEDITOR.plugins.addExternal('coops-dmp', '/ckplugins/coops-dmp/');
    CKEDITOR.plugins.addExternal('coops-cursors', '/ckplugins/coops-cursors/');
    CKEDITOR.plugins.addExternal('coops-sessionevents', '/ckplugins/coops-sessionevents/');
    
    CKEDITOR.plugins.addExternal('mrmonkey', '/ckplugins/mrmonkey/');
    
    var editor = CKEDITOR.appendTo( 'ckcontainer', {
      skin: 'moono',
      extraPlugins: 'coops,coops-connector,coops-dmp,coops-cursors,coops-sessionevents,mrmonkey',
      readOnly: true,
      height: 500,
      coops: {
        serverUrl: serverUrl
      }
    });
    
    /* CoOps status messages */
    
    editor.on("CoOPS:SessionStart", function (event) {
      $('.editor-status').html('Loaded');
    });
    
    editor.on("CoOPS:ContentDirty", function (event) {
      $('.editor-status').html('Unsaved');
    });
    
    editor.on("CoOPS:PatchSent", function (event) {
      $('.editor-status').html('Saving...');
    });
    
    editor.on("CoOPS:PatchAccepted", function (event) {
      $('.editor-status').html('Saved');
    });

    editor.on("CoOPS:ConnectionLost", function (event) {
      $('.notifications').notifications('notification', 'load', event.data.message).addClass('connection-lost-notification');
    });

    editor.on("CoOPS:Reconnect", function (event) {
      $('.notifications').find('.connection-lost-notification').notification("hide");
    });

    editor.on("CoOPS:CollaboratorJoined", function (event) {
      $('.collaborators').collaborators("addCollaborator", event.data.sessionId, event.data.displayName||'Anonymous', event.data.email||(event.data.sessionId + '@no.invalid'));
    });

    editor.on("CoOPS:CollaboratorLeft", function (event) {
      $('.collaborators').collaborators("removeCollaborator", event.data.sessionId);
    });
    
    // CoOPS Errors
    
    editor.on("CoOPS:Error", function (event) {
      $('.notifications').find('.connection-lost-notification').notification("hide");
      
      switch (event.data.severity) {
        case 'CRITICAL':
        case 'SEVERE':
          $('.notifications').notifications('notification', 'error', event.data.message);
        break;
        case 'WARNING':
          $('.notifications').notifications('notification', 'warning', event.data.message);
        break;
        default:
          $('.notifications').notifications('notification', 'info', event.data.message);
        break;
      }
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
    
    $('.collaborators').collaborators();
  });
  
}).call(this);