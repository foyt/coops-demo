(function() {
  
  var http = require('http');
  var url = require('url');
  var async = require('async');
  var ObjectId = require('mongojs').ObjectId;
  var _ = require('underscore');
  var Canvas = require('canvas');
  var Image = Canvas.Image;
  var db = require('./db');
  var packageJson = require('./package.json');
  var settings = require('./settings.json');
  
  module.exports.index = function (req, res) {
    if (!req.isAuthenticated()) {
      res.render('index', {
        title : 'CoOPS Demo',
        version: packageJson.version,
        loggedUser: req.user,
        files: [],
        piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
        piwikUrl: settings.piwik ? settings.piwik.url : null,
        piwikSiteId: settings.piwik ? settings.piwik.siteId : null
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
                files: files,
                piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
                piwikUrl: settings.piwik ? settings.piwik.url : null,
                piwikSiteId: settings.piwik ? settings.piwik.siteId : null
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
      loggedUser: req.user,
      piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
      piwikUrl: settings.piwik ? settings.piwik.url : null,
      piwikSiteId: settings.piwik ? settings.piwik.siteId : null
    });
  };
  
  module.exports.login = function (req, res) {
    res.render('login', {
      title : 'Login to Co-Ops Demo',
      loggedUser: req.user,
      redirectUrl: req.query.redirectUrl,
      piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
      piwikUrl: settings.piwik ? settings.piwik.url : null,
      piwikSiteId: settings.piwik ? settings.piwik.siteId : null
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
              file: file,
              piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
              piwikUrl: settings.piwik ? settings.piwik.url : null,
              piwikSiteId: settings.piwik ? settings.piwik.siteId : null
            });
          }
        }
      });
    }
  };
  
  module.exports.newimg = function (req, res) {
    var canvas = new Canvas(800, 800);
    
    db.files.insert({ revisionNumber: 0, content: canvas.toBuffer(), contentType: 'image/png;editor=CoIllusionist', properties: { title: 'Untitled', width: canvas.width, height: canvas.height } }, function(err, file) {
      if (err) {
        res.send(err, 500);
      } else {
        db.fileusers.insert({ fileId: file._id, userId: req.user._id, role: "OWNER" }, function (usersErr, fileUsers) {
          if (usersErr) {
            res.send(usersErr, 500);
          } else {
            res.redirect('/editimg/' + file._id.toString());
          }
        });
      }
    });
  };
  
  module.exports.editimg = function (req, res) {
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
              file: file,
              piwik: settings.piwik && settings.piwik.url && settings.piwik.siteId,
              piwikUrl: settings.piwik ? settings.piwik.url : null,
              piwikSiteId: settings.piwik ? settings.piwik.siteId : null
            });
            
          }
        }
      });
    }
  };
  
  module.exports.loadImage = function (req, res) {
    
    http.get(url.parse(req.query.src), function(httpRes) {
      var data = [];
      
      httpRes
        .on('data', function(chunk) {
          data.push(chunk);
        })
        .on('end', function() {
          var buffer = new Buffer(data.reduce(function(prev, current) {
            return prev.concat(Array.prototype.slice.call(current));
          }, []));
          
          res.writeHead(200, { 'Content-Type' : httpRes.headers.contentType });
          res.write(buffer);
          res.end();
        });
      
    });
  };
  
}).call(this);