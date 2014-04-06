(function() {
  
  var api = require('./api');

  module.exports = {
    
    fileGet: function (req, res) {
      var revisionNumber = parseInt(req.query.revisionNumber, 10);
      api.fileGet(revisionNumber, req.params.fileid, function (err, code, file) {
        if (err) {
          res.send(code, err);
        } else {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.send(code, JSON.stringify(file));
        }
      });
    },
    
    fileUpdate: function (req, res) {
      var revisionNumber = parseInt(req.query.revisionNumber, 10);
      var sessionId = req.query.sessionId;
      api.fileUpdate(sessionId, revisionNumber, req.params.fileid, function (err, code, patches) {
        if (err) {
          res.send(code, err);
        } else {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          if (patches) {
            res.send(code, JSON.stringify(patches));
          } else {
            res.send(code);
          }
        }
      });
    },
    
    filePatch: function (req, res) {
      api.filePatch(req.params.fileid, req.body, function (err, code) {
        if (err) {
          res.send(code, err);
        } else {
          res.send(code);
        }
      });
    },
    
    fileJoin: function (req, res) {
      var clientAlgorithms = req.query.algorithm;
      if (!(clientAlgorithms instanceof Array)) {
        clientAlgorithms = [clientAlgorithms];
      }
      
      api.fileJoin(req.params.fileid, req.user._id.toString(), clientAlgorithms, req.query.protocolVersion, function (err, code, join) {
        if (err) {
          res.send(code, err);
        } else {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.send(code, JSON.stringify(join));
        }
      });
    }
  };
  
}).call(this);