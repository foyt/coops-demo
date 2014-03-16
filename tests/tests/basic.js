(function() {

  var webdriver = require('selenium-webdriver');
  var utils = require('./utils');
  
  exports.attach = function (options) {
    options.tests.push({
      run: function() {
        var driver = new webdriver.Builder()
          .withCapabilities(webdriver.Capabilities.chrome())
          .build();
        
        driver.get('http://127.0.0.1:' + options.port + '/testck.html');
        
        var ck1Frame = webdriver.By.css('#ck1 .cke_wysiwyg_frame');
        var ck2Frame = webdriver.By.css('#ck2 .cke_wysiwyg_frame');

        // Wait for CK to load
        utils.waitFor(driver, ck1Frame, ck2Frame);

        // Type 'a' into ck1 and click update on both editors
        utils.typeIntoCK(driver, ck1Frame, 'a');
        
        driver.switchTo().defaultContent();
        driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();
        driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();
        
        // both editors should contain <p>a</p>
        utils.assertCKData(driver, ck1Frame, '<p>a</p>', 'CK1Data');
        utils.assertCKData(driver, ck2Frame, '<p>a</p>', 'CK2Data');
        // ..as should "server"

        driver.quit();
      }
    });
  };

  exports.init = function (done) {
    return done();
  };

}).call(this);