(function() {
  
  var http = require('http');
  var https = require('https');
  var fs = require('fs');
  var express = require('express');
  var passport = require('passport');

  var settings = require('./settings.json');
  var views = require('./views.js');
  var auth = require('./auth.js');
  var api = require('./api');
  var patterns = require('./patterns.js');

  var app = express();
  var httpServer = null;
  var httpsServer = null;
  
  if (settings.http) {
    httpServer = http.createServer(app);
    httpServer.listen(settings.http.port, settings.http.host);
    console.log("http server listening at " + settings.http.host + ':' + settings.http.port);
  }
  
  if (settings.https) {
    var certificate = {
      key: fs.readFileSync(settings.https.certKey).toString(),
      cert: fs.readFileSync(settings.https.cert).toString()
    };

    httpsServer = https.createServer(certificate, app);
    httpsServer.listen(settings.https.port, settings.https.host);
    console.log("https server listening at " + settings.https.host + ':' + settings.https.port);
  }
  
  function nocache(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
  }
  
  app.configure(function () {
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser({limit: '50mb'}));
    app.use(express.methodOverride());
    app.use(express.session({ secret: settings.sessionSecret }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
    
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
    
    /** 
     * Views
     */
    
    app.get('/', views.index);
    app.get('/login', views.login);
    app.get('/about', views.about);
    app.get('/newdoc', [auth.loggedIn], views.newdoc);
    app.get('/editdoc/:fileid', [auth.loggedIn, auth.ensureFileUser], views.editdoc);
    app.get('/newimg', [auth.loggedIn], views.newimg);
    app.get('/editimg/:fileid', [auth.loggedIn, auth.ensureFileUser], views.editimg);
    app.get('/loadimg', [nocache, auth.loggedInNoRedirect], views.loadImage);
    
    /** 
     * Patterns (temporary) 
     **/
    
    app.get('/patterns/', patterns.list);
    app.get('/patterns/:path([a-z.-_/]*)', patterns.get);
    
    /**
     * Auth
     */
    
    // Facebook
    
    app.get('/auth/facebook', [auth.storeRedictUrl], passport.authenticate('facebook', { scope: ['email'] } ));
    app.get('/auth/facebook/callback', passport.authenticate('facebook'), function(req, res) {
      var redirectUrl = req.session.redirectUrl||'/';
      req.session.redirectUrl = null;
      res.redirect(redirectUrl);
    });
    
    // GitHub
    
    app.get('/auth/github', [auth.storeRedictUrl], passport.authenticate('github', { scope: ['user:email'] } ));
    app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), function(req, res) {
      var redirectUrl = req.session.redirectUrl||'/';
      req.session.redirectUrl = null;
      res.redirect(redirectUrl);
    });
    
    // Google
    
    app.get('/auth/google', [auth.storeRedictUrl], passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'] } ));
    app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
      var redirectUrl = req.session.redirectUrl||'/';
      req.session.redirectUrl = null;
      res.redirect(redirectUrl);
    });
    
    // Logout
    
    app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
    });
    
    /**
     * API
     */
    
    // https://github.com/foyt/coops-spec/#get--load-request    
    app.get('/files/:fileid', [auth.loggedInNoRedirect, nocache], api.fileGet);
    
    // https://github.com/foyt/coops-spec/#get-update-update-request
    app.get('/files/:fileid/update', [auth.loggedInNoRedirect, nocache], api.fileUpdate);
    
    // https://github.com/foyt/coops-spec/#patch--patch-request
    app.patch('/files/:fileid', [auth.loggedInNoRedirect, nocache], api.filePatch);
    
    // https://github.com/foyt/coops-spec/#get-join-join-request
    app.get('/files/:fileid/join', [auth.loggedInNoRedirect, nocache], api.fileJoin);
  });
  
  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.static(__dirname + '/public_test'));
  });
  
}).call(this);