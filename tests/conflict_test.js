(function() {
  
  var assert = require('assert');
  var test = require('selenium-webdriver/testing');
  var webdriver = require('selenium-webdriver');
  var utils = require('./utils');
  var driver = null;
  var ck1Frame = webdriver.By.css('#ck1 .cke_wysiwyg_frame');
  var ck2Frame = webdriver.By.css('#ck2 .cke_wysiwyg_frame');
  
  test.describe('Selenium tests', function() {
  
    test.beforeEach(function () {
      driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .build();
      driver.get('http://127.0.0.1:8080/testck.html');

      // Wait for CK to load
      utils.waitFor(driver, ck1Frame, ck2Frame);
    });
    
    test.afterEach(function () {
      driver.quit();
    });
  
    test.it("Same change on both sides", function () {
      // Type 'a' into ck1 and click update
      driver.switchTo().frame(driver.findElement(ck1Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("a");
      driver.switchTo().defaultContent();
      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();

      // Type 'a' into ck2 and click update
      driver.switchTo().frame(driver.findElement(ck2Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("a");
      driver.switchTo().defaultContent();
      driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();

      // Both editors and server should contain text <p>a</p>
      utils.getCKData(driver, ck1Frame, function (data) {
        assert.equal(data, '<p>a</p>');
      });

      utils.getCKData(driver, ck2Frame, function (data) {
        assert.equal(data, '<p>a</p>');
      });
      
      driver.findElement(webdriver.By.css('.ck-content')).getAttribute('value').then(function(value) {
        assert.equal(value, '<p>a</p>');
      });
    });
  
    test.it("Partly matching conflict", function () {
      // Type 'abc' into ck1 and click update
      driver.switchTo().frame(driver.findElement(ck1Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("abc");
      driver.switchTo().defaultContent();
      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();

      // Type 'abd' into ck2 and click update
      driver.switchTo().frame(driver.findElement(ck2Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("abd");
      driver.switchTo().defaultContent();
      driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();

      // ck1 should contain <p>abc</p>
      utils.getCKData(driver, ck1Frame, function (data) {
        assert.equal(utils.removeLineBreaks(data), '<p>abc</p>', 'ck1');
      });

      // ck2 and server <p>abd</p><p>abc</p>
      utils.getCKData(driver, ck2Frame, function (data) {
        assert.equal(utils.removeLineBreaks(data), '<p>abc</p><p>abd</p>', 'ck2');
      });
      
      driver.findElement(webdriver.By.css('.ck-content')).getAttribute('value').then(function(value) {
        assert.equal(utils.removeLineBreaks(value), '<p>abc</p><p>abd</p>', 'server');
      });
      
      // update ck1 
      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();
    });
  
  });
  
}).call(this);