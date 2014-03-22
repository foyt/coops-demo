(function() {
  /* global CKEDITOR, diff_match_patch, Fmes, hex_md5, InternalPatch, DmpDifferenceAlgorithm:true */
    
  DmpDifferenceAlgorithm = CKEDITOR.tools.createClass({
    $: function(editor) {
      if ((typeof diff_match_patch) === 'undefined') {
        throw new Error('diff_match_patch is missing');
      }

      if ((typeof Fmes) === 'undefined') {
        throw new Error('Fmes is missing');
      }

      if ((typeof hex_md5) === 'undefined') {
        throw new Error('hex_md5 is missing');
      }
      
      this._editor = editor;
      
      this._pendingPatches = [];
      this._contentCooldownTime = 200;
      this._contentCoolingDown = false;

      editor.on("CoOPS:SessionStart", this._onSessionStart, this);
    },
    proto : {
      getName: function () {
        return "dmp";
      },
      
      _createChecksum: function (value) {
        return hex_md5(value);
      },
      
      _removeLineBreaks: function (data) {
        return (data||'').replace(/\n/g,"");
      },
      
      _onSessionStart: function (event) {
        this._diffMatchPatch = new diff_match_patch();
        this._fmes = new Fmes();
        
        this._editor.on("contentChange", this._onContentChange, this);
        this._editor.on("CoOPS:PatchReceived", this._onPatchReceived, this);
        this._editor.on("CoOPS:RevertedContentReceived", this._onRevertedContentReceived, this);
      },
      
      _emitContentPatch: function (oldContent, newContent) {
        var diff = this._diffMatchPatch.diff_main(oldContent, newContent);
        this._diffMatchPatch.diff_cleanupEfficiency(diff);
        var patch = this._diffMatchPatch.patch_toText(this._diffMatchPatch.patch_make(oldContent, diff));

        this._editor.fire("CoOPS:ContentPatch", {
          patch: patch
        });
      },
    
      _onContentChange: function (event) {
        if (!this._contentCoolingDown) {
          this._contentCoolingDown = true;
          
          var oldContent = event.data.oldContent;
          var currentContent = event.data.currentContent;
          
          this._emitContentPatch(oldContent, currentContent);

          CKEDITOR.tools.setTimeout(function() {
            if (this._pendingOldContent && this._pendingNewContent) {
              this._emitContentPatch(this._pendingOldContent, this._pendingNewContent);
              delete this._pendingOldContent;
              delete this._pendingNewContent;
            }
            
            this._contentCoolingDown = false;
          }, this._contentCooldownTime, this);
        } else {
          if (!this._pendingOldContent) {
            this._pendingOldContent = event.data.oldContent;
          }
          
          this._pendingNewContent = event.data.currentContent;
        }
      },
      
      _applyChanges: function (newText) {
        // TODO: cross-browser support for document creation
        var text = this._editor.getData();

        if (!text) {
          // We do not have old content so we can just directly set new content as editor data
          this._editor.setData(newText);
        } else {
          if (this._editor.config.coops.mode === 'development') {
            newText = this._removeLineBreaks(newText);
          }
          
          // Read original and patched texts into html documents
          var document1 = document.implementation.createHTMLDocument('');
          var document2 = document.implementation.createHTMLDocument('');
          document1.documentElement.innerHTML = this._editor.dataProcessor.toHtml( text );
          document2.documentElement.innerHTML = this._editor.dataProcessor.toHtml( newText );

          // Create delta of two created documents
          var delta = this._fmes.diff(document1, document2);
          
          // And apply delta into a editor
          (new InternalPatch()).apply(this._editor.document.$, delta);
          this._editor._.data = this._editor.dataProcessor.toHtml(this._editor.document.getBody().$.innerHTML);
          
          if (this._editor.config.coops.mode === 'development') {
            var newTextChecksum = this._createChecksum(newText);
            var patchedText = this._removeLineBreaks(this._editor.getData());
            var patchedDataChecksum = this._createChecksum(patchedText);
            if (newTextChecksum !== patchedDataChecksum) {
              this._editor.getCoOps().log(["Patching Failed", newText, patchedText]);
              throw new Error("Patching failed");
            }
          }
        }
      },
      
      _lockEditor: function () {
        var body = this._editor.document.getBody();
        if (!body.isReadOnly()) {
          body.data('cke-editable', 1);
        } else {
          body.data('was-readonly', 1);
        }
        
        this._editor.getChangeObserver().pause();
      },
      
      _unlockEditor: function () {
        var body = this._editor.document.getBody();
        if (body.data('was-readonly')) {
          body.data('was-readonly', false);
        } else {
          body.data('cke-editable', false);
        }
        
        this._editor.getChangeObserver().reset();
        this._editor.getChangeObserver().resume();
      },
      
      _isPatchApplied: function (patchResult) {
        for (var j = 0, jl = patchResult[1].length; j < jl; j++) {
          if (!patchResult[1][j]) {
            return false;
          }
        }
        
        return true;
      },
      
      _applyPatch: function (patch, patchChecksum, revisionNumber, callback) {
        this._editor.document.$.normalize();
        var currentContent = this._editor.getData();
        var patchBaseContent = this._editor.getCoOps().getSavedContent();
        if (patchBaseContent === null) {
          patchBaseContent = currentContent;
          this._editor.getCoOps().log("Saved content missing. Patching against current content");
        }
        
        var remoteDiff = this._diffMatchPatch.patch_fromText(patch);
        var removePatchResult = this._diffMatchPatch.patch_apply(remoteDiff, patchBaseContent);
        
        if (this._isPatchApplied(removePatchResult)) {
          var remotePatchedText = removePatchResult[0];
          var remotePatchedChecksum = this._createChecksum(remotePatchedText);
          
          if (patchChecksum !== remotePatchedChecksum) {
            this._editor.getCoOps().log([
              "Reverting document because checksum did not match",
              patchBaseContent,
              patch,
              revisionNumber,
              patchChecksum,
              remotePatchedChecksum,
              remotePatchedText
            ]);

            this._editor.fire("CoOPS:ContentRevert");
          } else {
            var localPatch = null;
            var locallyChanged = this._editor.getCoOps().isLocallyChanged();

            if (locallyChanged) {
              this._editor.getCoOps().log("Received a patch but we got some local changes");
              
              var localDiff = this._diffMatchPatch.diff_main(patchBaseContent, this._editor.getCoOps().getUnsavedContent());
              this._diffMatchPatch.diff_cleanupEfficiency(localDiff);
              localPatch = this._diffMatchPatch.patch_make(patchBaseContent, localDiff);
              
              if (this._patchesEqual(localPatch, remoteDiff)) {
                this._editor.getCoOps().log("Local change equals remote change, dropping local patch");
                localPatch = null;
              }
            }
            
            if (localPatch) {
              var localPatchResult = this._diffMatchPatch.patch_apply(localPatch, remotePatchedText);
              if (this._isPatchApplied(localPatchResult)) {
                var locallyPatchedText = localPatchResult[0];
                
                try {
                  this._applyChanges(locallyPatchedText);
                } catch (e) {
                  // Change applying of changed crashed, falling back to setData
                  this._editor.setData(locallyPatchedText);
                }

                callback();
              }
            } else {
              try {
                this._applyChanges(remotePatchedText);
              } catch (e) {
                // Change applying of changed crashed, falling back to setData
                this._editor.setData(remotePatchedText);
              }
              
              callback();
            }

            this._editor.fire("CoOPS:PatchApplied", {
              content : remotePatchedText
            });
          }
          
        } else {
          this._editor.getCoOps().log("Reverting document because could not apply the patch");
          this._editor.fire("CoOPS:ContentRevert");
        }
      },
      
      _applyNextPatch: function () {
        if (this._pendingPatches.length > 0) {
          // First we lock the editor, so we can do some magic without 
          // outside interference
          
          this._lockEditor();

          var pendingPatch = this._pendingPatches.shift();
          var _this = this;
          this._applyPatch(pendingPatch.patch, pendingPatch.patchChecksum, pendingPatch.revisionNumber, function () {
            _this._applyNextPatch();
          });
        } else {
          this._unlockEditor();
        }
      },
      
      _patchesEqual: function (patch1, patch2) {
        if (patch1.length === patch2.length) {
          for (var i = 0, l = patch1.length; i < l; i++) {
            var diffs1 = patch1[i].diffs;
            var diffs2 = patch2[i].diffs;
            
            if (diffs1.length === diffs2.length) {
              for (var j = 0, dl = diffs1.length; j < dl; j++) {
                if ((diffs1[j][0] !== diffs2[j][0])||(diffs1[j][1] !== diffs2[j][1])) {
                  return false;
                }
              }
            } else {
              return false;
            }
          }
          
          return true;
        }
        
        return false;
      },

      _onPatchReceived: function (event) {
        var patch = event.data.patch;
        var patchChecksum = event.data.checksum;
        var revisionNumber = event.data.revisionNumber;
        
        if (patch && patchChecksum) {
          this._pendingPatches.push({
            patch: patch,
            patchChecksum: patchChecksum,
            revisionNumber: revisionNumber
          });
        }

        this._applyNextPatch();
      },
      
      _onRevertedContentReceived: function (event) {
        var revertedContent = event.data.content;

        var localPatch = null;
        var locallyChanged = this._editor.getCoOps().isLocallyChanged();
        var savedContent = this._editor.getCoOps().getSavedContent();

        if (locallyChanged) {
          this._editor.getCoOps().log("Content reverted but we have local changes");
          var localDiff = this._diffMatchPatch.diff_main(savedContent, this._editor.getCoOps().getUnsavedContent());
          this._diffMatchPatch.diff_cleanupEfficiency(localDiff);
          localPatch = this._diffMatchPatch.patch_make(savedContent, localDiff);
        }
        
        if (localPatch) {
          var localPatchResult = this._diffMatchPatch.patch_apply(localPatch, revertedContent);
          if (this._isPatchApplied(localPatchResult)) {
            revertedContent = localPatchResult[0];
          }
        }

        try {
          this._applyChanges(revertedContent);
        } catch (e) {
          // Change applying of changed crashed, falling back to setData
          this._editor.setData(revertedContent);
        }
        
        this._editor.fire("CoOPS:ContentReverted", {
          content : revertedContent
        });
        
        this._unlockEditor();
      }
    }
  });
  
  CKEDITOR.plugins.add( 'coops-dmp', {
    requires: ['coops'],
    init: function( editor ) {
      editor.on('CoOPS:BeforeJoin', function(event) {
        event.data.addAlgorithm(new DmpDifferenceAlgorithm(event.editor));
      });
    }
  });

}).call(this);