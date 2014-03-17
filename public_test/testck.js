(function() {
  /* global CKEDITOR, diff_match_patch, hex_md5 */

  var PROTOCOL_VERSION = "1.0.0";
  var ALGORITHMS = ["dmp"];
  
  CKEDITOR.plugins.addExternal('change', '/ckplugins/change/');
  CKEDITOR.plugins.addExternal('coops', '/ckplugins/coops/');
  CKEDITOR.plugins.addExternal('coops-dmp', '/ckplugins/coops-dmp/');
  CKEDITOR.plugins.addExternal('coops-mock-connector', '/ckplugins/coops-mock-connector/');
  
  $.widget("custom.TestCK", {
    options: {
      
    },
    _create : function() {
      this._editor = CKEDITOR.appendTo($('<div>').appendTo(this.element).get(0), {
        toolbar: [
          { name: 'insert', items : [ 'Image','Table','HorizontalRule','SpecialChar'] },
          { name: 'styles', items : [ 'Styles','Format' ] },
          { name: 'basicstyles', items : [ 'Bold','Italic','Strike','-','RemoveFormat' ] }
        ],
        extraPlugins: 'coops,coops-dmp,coops-mock-connector',
        readOnly: true,
        coops: {
          serverUrl: 'dummy',
          mode: 'development'
        }
      });
      
      this._editor.on("CoOPS:ContentPatch", $.proxy(this._onCoOPSContentPatch, this));
      
      this.element.append($('<div>')
        .addClass('ck-actions')
        .append($('<a>').addClass('ck-action-update').text('Update').attr('href', '#').click($.proxy(this._onUpdateClick, this)))
      );
    },
    
    sessionId: function () {
      return this._editor._mock._sessionId;
    },
    
    revisionNumber: function () {
      return this._editor._mock._revisionNumber;
    },
    
    _onCoOPSContentPatch: function (event) {
      this._editor.getChangeObserver().pause();
      
      $('#server').TestServer('patch', this.sessionId(), this.revisionNumber(), event.data.patch, {}, {}, $.proxy(function (status) {
        switch (status) {
          case 204:
            // Request was ok
          break;
          case 409:
            this._editor.getChangeObserver().resume();
            this._editor.fire("CoOPS:PatchRejected");
          break;
          default:
            this._editor.fire("CoOPS:Error", {
              type: "patch",
              error: 'patch error'
            });
          break;
        }
      }, this));
    },
    
    _onUpdateClick: function (event) {
      event.preventDefault();
      
      $('#server').TestServer('updates', this._editor._mock._revisionNumber, $.proxy(function (status, patches) {
        if (status === 200) {
          for (var i = 0, l = patches.length; i < l; i++) {
            var patch = patches[i];
            
            if (this._editor._mock._sessionId !== patch.sessionId) {
              if (this._editor.fire("CoOPS:PatchReceived", {
                patch : patch.patch,
                checksum: patch.checksum,
                revisionNumber: patch.revisionNumber,
                properties: patch.properties
              })) {
                this._editor._mock._revisionNumber = patch.revisionNumber;
              }
            } else {
              this._editor._mock._revisionNumber = patch.revisionNumber;
              this._editor.getChangeObserver().resume();
              this._editor.fire("CoOPS:PatchAccepted", { });
            }
          }
        } else {
          if ((status !== 204)&&(status !== 304)) {
            this._editor.fire("CoOPS:Error", {
              type: "update",
              error: 'update error'
            });
          }
        }
      }, this));
      
    },
    
    _destroy : function() {
    }
  });
  
  $.widget("custom.TestServer", {
    options: {
      revision: 0,
      content: ''
    },
    _create : function() {
      this._revisions = [];
      
      this.element.append($('<div>').append($('<label>').text('Revision')));
      this.element.append($('<input>').addClass('ck-rev').attr({"autocomplete": "off"}).val(this.options.revision));
      this.element.append($('<div>').append($('<label>').text('Content')));
      this.element.append($('<textarea>').addClass('ck-content').attr({"autocomplete": "off"}).css({ width: '100%' }).val(this.options.content));
    },
    
    content: function () {
      return this.element.find('.ck-content').val();
    },
    
    revision: function () {
      return parseInt(this.element.find('.ck-rev').val(), 10);
    },
    
    properties: function () {
      return {};
    },

    extensions: function () {
      return {};
    },
    
    patch: function (sessionId, revisionNumber, patch, properties, extensions, callback) {
      if (this.revision() === revisionNumber) {
        var patchRevision = revisionNumber + 1;
        
        if (patch) {
          this._dmpPatch(patch, this.content(), this.properties(), properties, $.proxy(function (err, patched) {
            $('.ck-rev').val(patchRevision);
            $('.ck-content').val(patched);
            
            this._revisions.push({
              revisionNumber: patchRevision,
              patch: patch,
              checksum: hex_md5(patched),
              sessionId: sessionId,
              properties: properties,
              extensions: extensions
            });
            
            callback(err ? 500 : 204);
          }, this));
        } else {
          this._revisions.push({
            revisionNumber: patchRevision,
            patch: null,
            checksum: null,
            sessionId: sessionId,
            properties: properties,
            extensions: extensions
          });
          
          $('.ck-rev').val(patchRevision);
          callback(204);
        }
      } else {
        callback(409);
      }
    },
    
    updates: function (revisionNumber, callback) {
      var result = [];
      for (var i = 0, l = this._revisions.length; i < l; i++) {
        if (this._revisions[i].revisionNumber > revisionNumber) {
          result.push(this._revisions[i]);
        }
      }
      
      if (result.length === 0) {
        callback(204);
      } else {
        callback(200, result);
      }
      
      return result;
    },
    
    _dmpPatch: function (patch, text, fileProperties, patchProperties, callback) {
      var diffMatchPatch = new diff_match_patch();
      
      var patchApplied = true;
      var patches = diffMatchPatch.patch_fromText(patch);
      var result = diffMatchPatch.patch_apply(patches, text);
      for (var j = 0, jl = result[1].length; j < jl; j++) {
        if (result[1][j] === false) {
          patchApplied = false;
        }
      }
      
      if (patchApplied) {
        callback(null, result[0], patchProperties);
      } else {
        callback("Could not apply patch", null, null);
      }
    },
    
    _destroy : function() {
    }
  });
  
  $(document).ready(function (event) {
    $('#server').TestServer();
    $('#ck1').TestCK();
    $('#ck2').TestCK();
  });
  

}).call(this);