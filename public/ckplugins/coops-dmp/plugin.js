(function() {
  
  /* global CKEDITOR, diff_match_patch, Fmes, hex_md5, InternalPatch */
  
  if ((typeof diff_match_patch) === 'undefined') {
    alert('diff_match_patch is missing');
  }

  if ((typeof Fmes) === 'undefined') {
    alert('Fmes is missing');
  }

  if ((typeof hex_md5) === 'undefined') {
    alert('hex_md5 is missing');
  }
    
  CKEDITOR.plugins.add( 'coops-dmp', {
    requires: ['coops'],
    init: function( editorInstance ) {
      CKEDITOR.coops.DmpDifferenceAlgorithm = CKEDITOR.tools.createClass({
        base: CKEDITOR.coops.Feature,
        $: function(editor) {
          this.base(editor);
          
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
          
          _onSessionStart: function (event) {
            this._diffMatchPatch = new diff_match_patch();
            this._fmes = new Fmes();
            
            this.getEditor().on("CoOPS:ContentDirty", this._onContentDirty, this);
            this.getEditor().on("CoOPS:PatchReceived", this._onPatchReceived, this);
            this.getEditor().on("CoOPS:RevertedContentReceived", this._onRevertedContentReceived, this);
          },
          
          _emitContentPatch: function (oldContent, newContent) {
            var diff = this._diffMatchPatch.diff_main(oldContent, newContent);
            this._diffMatchPatch.diff_cleanupEfficiency(diff);
            var patch = this._diffMatchPatch.patch_toText(this._diffMatchPatch.patch_make(oldContent, diff));

            this.getEditor().fire("CoOPS:ContentPatch", {
              patch: patch
            });
          },
        
          _onContentDirty: function (event) {
            if (!this._contentCoolingDown) {
              this._contentCoolingDown = true;
              
              var savedContent = event.data.savedContent;
              var unsavedContent = event.data.unsavedContent;

              this._emitContentPatch(savedContent, unsavedContent);

              CKEDITOR.tools.setTimeout(function() {
                if (this._pendingSavedContent && this._pendingUnsavedContent) {
                  this._emitContentPatch(this._pendingSavedContent, this._pendingUnsavedContent);
                  delete this._pendingSavedContent;
                  delete this._pendingUnsavedContent;
                }
                
                this._contentCoolingDown = false;
              }, this._contentCooldownTime, this);
            } else {
              if (!this._pendingSavedContent) {
                this._pendingSavedContent = event.data.savedContent;
              }
              
              this._pendingUnsavedContent = event.data.unsavedContent;
            }
          },
          
          _removeLineBreaks: function (data) {
            return (data||'').replace(/\n/g,"");
          },
          
          _createDocument: function (html) {
            var editor = this.getEditor();
            var result = document.implementation.createHTMLDocument('');
            result.documentElement.innerHTML = editor.dataProcessor.toHtml( html );
            return result;
          },
          
          _applyChanges: function (text, newText) {
            // TODO: cross-browser support for document creation
            var editor = this.getEditor();

            if (!text) {
              // We do not have old content so we can just directly set new content as editor data
              editor.setData(newText);
            } else {
              if (editor.config.coops.mode === 'development') {
                newText = this._removeLineBreaks(newText);
              }
              
              // Read original and patched texts into html documents
              var originalDocument = this._createDocument(text);
              var patchedDocument = this._createDocument(newText);
              
              // Create delta of two created documents
              var delta = this._fmes.diff(originalDocument, patchedDocument);
              
              // And apply delta into a editor
              (new InternalPatch()).apply(editor.document.$, delta);
              editor._.data = editor.document.getBody().getHtml();
              
              if (editor.config.coops.mode === 'development') {
                var newTextChecksum = this._createChecksum(newText);
                var patchedText = this._removeLineBreaks(editor.getData(true));
                var patchedDataChecksum = this._createChecksum(patchedText);
                if (newTextChecksum !== patchedDataChecksum) {
                  throw new Error("Patching failed");
                }
              }
            }
          },
          
          _lockEditor: function () {
            var editor = this.getEditor();
            var body = editor.document.getBody();
            if (!body.isReadOnly()) {
              body.data('cke-editable', 1);
            } else {
              body.data('was-readonly', 1);
            }
            
            editor.getChangeObserver().pause();
          },
          
          _unlockEditor: function () {
            var editor = this.getEditor();
            var body = editor.document.getBody();
            if (body.data('was-readonly') == 1) {
              body.data('was-readonly', false);
            } else {
              body.data('cke-editable', false);
            }
            
            editor.getChangeObserver().reset();
            editor.getChangeObserver().resume();  
          },
          
          _isPatchApplied: function (patchResult) {
            for (var j = 0, jl = patchResult[1].length; j < jl; j++) {
              if (patchResult[1][j] == false) {
                return false;
              }
            }
            
            return true;
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
          
          _applyPatch: function (patch, patchChecksum, revisionNumber, callback) {
            var editor = this.getEditor();
            editor.document.$.normalize();
            
            var remotePatchedText = null;
            var savedContent = this.getEditor().getCoOps().getSavedContent();
            var remotePatch = this._diffMatchPatch.patch_fromText(patch);
            var locallyChanged = this.getEditor().getCoOps().isLocallyChanged();
            var localPatch = null;
            
            if (locallyChanged) {
              var unsavedContent = this.getEditor().getCoOps().getUnsavedContent();
              var localDiff = this._diffMatchPatch.diff_main(savedContent, unsavedContent);
              localPatch = this._diffMatchPatch.patch_make(savedContent, localDiff);
              
              if (this._patchesEqual(remotePatch, localPatch)) {
                localPatch = null;
              }
            }
            
            var remotePatchResult = this._diffMatchPatch.patch_apply(remotePatch, savedContent);
            if (this._isPatchApplied(remotePatchResult)) {
              remotePatchedText = remotePatchResult[0];
              var remotePatchedChecksum = this._createChecksum(remotePatchedText);
              if (patchChecksum !== remotePatchedChecksum) {
                // Remove patching failed on saved content, revert is needed 
                this.getEditor().fire("CoOPS:ContentRevert");
                return;
              }
            }
            
            if (localPatch) {
              var localPatchResult = this._diffMatchPatch.patch_apply(localPatch, remotePatchedText);
              if (this._isPatchApplied(localPatchResult)) {
                var locallyPatchedText = localPatchResult[0];
                
                try {
                  this._applyChanges(savedContent, locallyPatchedText);
                } catch (e) {
                  if (editor.config.coops.mode === 'development') {
                    throw new Error(e);
                  } else {
                    // Change applying of changed crashed, falling back to setData
                    editor.setData(locallyPatchedText);
                  }
                }
                
                editor.fire("CoOPS:PatchMerged", {
                  patched : remotePatchedText,
                  merged: locallyPatchedText
                });
                
                callback();
              } else {
                editor.fire("CoOPS:LocalChangesDiscarded");
              }
            } else {
              try {
                this._applyChanges(savedContent, remotePatchedText);
              } catch (e) {
                if (editor.config.coops.mode === 'development') {
                  throw new Error(e);
                } else {
                  // Change applying of changed crashed, falling back to setData
                  editor.setData(remotePatchedText);
                }
              }
      
              editor.fire("CoOPS:PatchApplied", {
                content : remotePatchedText
              });
              
              callback();
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
            var editor = event.editor;
            var revertedContent = event.data.content;
            var localPatch = null;
            var locallyChanged = this.getEditor().getCoOps().isLocallyChanged();
            // TODO: currentContent is undefined...

            if (locallyChanged) {
              if (window.console) {
                console.log("Content reverted but we have local changes");
              }
              
              var patchBaseContent = this.getEditor().getCoOps().getSavedContent();
              if (patchBaseContent === null) {
                patchBaseContent = currentContent;
                if (window.console) {
                  console.log("Saved content missing. Patching against current content");
                }
              }
              
              var localDiff = this._diffMatchPatch.diff_main(patchBaseContent, this.getEditor().getCoOps().getUnsavedContent());
              this._diffMatchPatch.diff_cleanupEfficiency(localDiff);
              localPatch = this._diffMatchPatch.patch_make(patchBaseContent, localDiff);
            }
            
            if (localPatch) {
              var localPatchResult = this._diffMatchPatch.patch_apply(localPatch, revertedContent);
              if (this._isPatchApplied(localPatchResult)) {
                revertedContent = localPatchResult[0];
              }
            }

            try {
              this._applyChanges(currentContent, revertedContent);
            } catch (e) {
              // Change applying of changed crashed, falling back to setData
              editor.setData(revertedContent);
            }
            
            editor.fire("CoOPS:ContentReverted", {
              content : revertedContent
            });
            
            this._unlockEditor();
          }
        }
      });
      
      editorInstance.on('CoOPS:BeforeJoin', function(event) {
        event.data.addAlgorithm(new CKEDITOR.coops.DmpDifferenceAlgorithm(event.editor));
      });
    }
  });

}).call(this);