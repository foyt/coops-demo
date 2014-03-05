(function() {
  
  var uuid = require('node-uuid');
  var db = require('./db');
  var ObjectId = require('mongojs').ObjectId;
  var packageJson = require('./package.json');
  
  module.exports.index = function (req, res) {
    res.render('index', {
      title : 'Co-Ops Demo',
      version: packageJson.version,
      loggedUser: req.user
    });
  };

  module.exports.about = function (req, res) {
    res.render('about', {
      title : 'About Co-Ops Demo',
      version: packageJson.version,
      loggedUser: req.user
    });
  };
  
  module.exports.login = function (req, res) {
    res.render('login', {
      title : 'Login to Co-Ops Demo',
      loggedUser: req.user
    });
  };
  
  module.exports.newdoc = function (req, res) {
    db.files.insert({ revisionNumber: 0, name: uuid.v4(), content: "", contentType: 'text/html;editor=CKEditor' }, function(err, file) {
      if (err) {
        res.send(err, 500);
      } else {
        res.redirect('/editdoc/' + file._id.toString());
      }
    });
  };
  
  module.exports.editdoc = function (req, res) {
    var fileId = req.params.fileid;
    if (!fileId) {
      res.send("Not Found", 404);
    } else {
      db.files.findOne({ _id: new ObjectId(fileId.toString()) }, function(err, file) {
        if (err) {
          res.send(err, 500);
        } else {
          if (!file) {
            res.send("Not Found", 404);
          } else {
            res.render('editdoc', {
              title : 'Edit document',
              loggedUser: req.user
            });
          }
        }
      });
    }
  };
  
}).call(this);