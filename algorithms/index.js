(function() {
  
  var broadway = require("broadway");
  var broadwayApp = new broadway.App();
  var diffAlgorithms = [];
  
  broadwayApp.use( require("../plugins/dmp"), { diffAlgorithms: diffAlgorithms } );
  broadwayApp.use( require("../plugins/uint2darr-lw"), { diffAlgorithms: diffAlgorithms } );
  
  broadwayApp.init(function (err) {
    if (err) {
      console.log(err);
    } else {
      for (var i = 0, l = diffAlgorithms.length; i < l; i++) {
        var diffAlgorithm = diffAlgorithms[i];
        console.log("Registering diff algorithm " + diffAlgorithm.getName());
      }
    }
  });
  
  module.exports.getAlgorithms = function () {
    var names = [];
    
    for (var i = 0, l = diffAlgorithms.length; i < l; i++) {
      var diffAlgorithm = diffAlgorithms[i];
      names.push(diffAlgorithm.getName());
    }
    
    return names;
  };
  
  module.exports.getAlgorithm = function (name) {
    for (var i = 0, l = diffAlgorithms.length; i < l; i++) {
      var diffAlgorithm = diffAlgorithms[i];
      if (diffAlgorithm.getName() === name) {
        return diffAlgorithm;
      }
    }
  };
  
  module.exports.isAlgorithmAvailable = function (name) {
    return this.getAlgorithms().indexOf(name) !== -1;
  };
  
}).call(this);