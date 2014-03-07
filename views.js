(function() {
  
  var async = require('async');
  var ObjectId = require('mongojs').ObjectId;
  var _ = require('underscore');

  var db = require('./db');
  var packageJson = require('./package.json');
  
  module.exports.index = function (req, res) {
    if (!req.isAuthenticated()) {
      res.render('index', {
        title : 'CoOPS Demo',
        version: packageJson.version,
        loggedUser: req.user,
        files: []
      });
    } else {
      db.fileusers.find( { userId: new ObjectId( req.user._id.toString() ) }, function (err, fileUsers) {
        if (err) {
          res.send(err, 500);
        } else {
          db.files.find( { _id: { $in: _.pluck(fileUsers, 'fileId') } }, function (err, files) {
            if (err) {
              res.send(err, 500);
            } else {
              res.render('index', {
                title : 'CoOPS Demo',
                version: packageJson.version,
                loggedUser: req.user,
                files: files
              });
            }
          });
        }
      });
    }
  };

  module.exports.about = function (req, res) {
    res.render('about', {
      title : 'About CoOPS Demo',
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
    db.files.insert({ revisionNumber: 0, content: "", contentType: 'text/html;editor=CKEditor', properties: { title: 'Untitled' } }, function(err, file) {
      if (err) {
        res.send(err, 500);
      } else {
        db.fileusers.insert({ fileId: file._id, userId: req.user._id, role: "OWNER" }, function (usersErr, fileUsers) {
          if (usersErr) {
            res.send(usersErr, 500);
          } else {
            res.redirect('/editdoc/' + file._id.toString());
          }
        });
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
              loggedUser: req.user,
              file: file
            });
          }
        }
      });
    }
  };
  
  module.exports.editimg= function (req, res) {
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
            res.render('editimg', {
              title : 'Edit image',
              loggedUser: req.user,
              file: file
            });
          }
        }
      });
    }
  };
  
}).call(this);