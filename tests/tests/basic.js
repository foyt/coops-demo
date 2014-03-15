(function() {

  var webdriver = require('selenium-webdriver');

  exports.attach = function (options) {
    options.tests.push({
      run: function() {
        var driver = new webdriver.Builder()
          .withCapabilities(webdriver.Capabilities.chrome())
          .build();
        
        driver.get('http://127.0.0.1:' + options.port + '/testck.html');
        driver.quit();
      }
    });
  };

  exports.init = function (done) {
    return done();
  };

}).call(this);