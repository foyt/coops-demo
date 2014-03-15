(function() {
  
  var http = require('http');
  var broadway = require("broadway");
  var broadwayApp = new broadway.App();
  var express = require('express');
  
  /* Settings */
  
  var port = 12345;
  
  /* Tests*/
  
  var tests = [];
  broadwayApp.use( require("./tests/basic"), { tests: tests, port: port });
  broadwayApp.init(function (err) {
    if (err) {
      console.log(err);
    }
  });
  
  /* Http server */
  
  var app = express();
  var httpServer = http.createServer(app);
  app.configure(function () {
    app.use(express.logger());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.use(express.static(__dirname + '/../public'));
    
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  
  httpServer.listen(port, function () {
    /* Run */
    
    for (var i = 0, l = tests.length; i < l; i++) {
      tests[i].run();
    }
    
    // this.close();
  }.bind(httpServer));
  
}).call(this);