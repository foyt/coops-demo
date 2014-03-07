(function() {
  
  var fs = require('fs');
  var _ = require('underscore');

  function addListFiles(result, directory) {
    var files = fs.readdirSync(__dirname + directory);
    for (var i = 0, l = files.length; i < l; i++) {
      var file = files[i];
      var stat = fs.statSync(__dirname + directory + '/' + file);
      if (stat.isDirectory()) {
        addListFiles(result, directory + '/' + file);
      } else {
        result.push({
          name: file,
          path: directory + '/' + file
        });
      }
    }
  }
  
  module.exports.list = function (req, res) {
    var result = [];
    addListFiles(result, '/patterns');
    res.send(200, JSON.stringify(result));
  };
  
  module.exports.get = function (req, res) {
    var patternPath = req.params.path;
    
    fs.readFile(__dirname + '/patterns/' + patternPath, function(err, data) {
      if (err) {
        res.send(500, err);
      } else {
        res.writeHead(200, { 'Content-Type' : 'image/png' });
        res.write(data);
        res.end();
      }
    });
        
    
   
  };
  
}).call(this);