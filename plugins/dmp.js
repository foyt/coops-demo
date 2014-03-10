(function() {
  
  var DiffMatchPatchMod = require('googlediff');
  var diffMatchPatch = new DiffMatchPatchMod();

  exports.attach = function attach(options) {
    options.diffAlgorithms.push({
      
      patch: function(patch, text, fileProperties, patchProperties, callback) {
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
      
      unpatch: function(patch, text, callback) {
        var patchApplied = true;
        var patches = diffMatchPatch.patch_fromText(patch);

        // Switch places of DIFF_DELETE and DIFF_INSERT
        for (var patchIndex = 0, patchesLength = patches.length; patchIndex < patchesLength; patchIndex++) {
          for (var diffIndex = 0, diffsLength = patches[patchIndex].diffs.length; diffIndex < diffsLength; diffIndex++) {
            patches[patchIndex].diffs[diffIndex][0] *= -1;
          }
        }

        var result = diffMatchPatch.patch_apply(patches, text);
        for (var j = 0, jl = result[1].length; j < jl; j++) {
          if (result[1][j] === false) {
            patchApplied = false;
          }
        }
        
        if (patchApplied) {
          callback(null, result[0]);
        } else {
          callback("Could not unpatch", null);
        }
      },
      
      getName: function () {
        return 'dmp';
      }
      
    });
  };
  
  exports.init = function (done) {
    return done();
  };
  
}).call(this);