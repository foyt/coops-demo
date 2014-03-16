(function() {
  
  var assert = require('assert');
  var test = require('selenium-webdriver/testing');
  var webdriver = require('selenium-webdriver');
  var utils = require('./utils');
  
  var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();
  
  test.describe('Selenium tests', function() {
  
    test.it("One character test", function () {
      driver.get('http://127.0.0.1:8080/testck.html');
      
      var ck1Frame = webdriver.By.css('#ck1 .cke_wysiwyg_frame');
      var ck2Frame = webdriver.By.css('#ck2 .cke_wysiwyg_frame');
      
      // Wait for CK to load
      utils.waitFor(driver, ck1Frame, ck2Frame);

      // Type 'a' into ck1 and click update on both editors
      driver.switchTo().frame(driver.findElement(ck1Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("a");
      driver.switchTo().defaultContent();
      
      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();
      driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();
      
      // Both editors and server should contain text <p>a</p>
      utils.getCKData(driver, ck1Frame, function (data) {
        assert.equal(data, '<p>a</p>');
      });

      utils.getCKData(driver, ck2Frame, function (data) {
        assert.equal(data, '<p>a</p>');
      });
      
      driver.findElement(webdriver.By.css('.ck-content')).getAttribute('value').then(function(value) {
        assert.equal(value, '<p>a</p>\n');
      });
      
      driver.quit();
    });
  
  });
  
}).call(this);