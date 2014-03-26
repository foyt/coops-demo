(function() {
  
  var assert = require('assert');
  var test = require('selenium-webdriver/testing');
  var webdriver = require('selenium-webdriver');
  var utils = require('./utils');
  var driver = null;
  var ck1Frame = webdriver.By.css('#ck1 .cke_wysiwyg_frame');
  var ck2Frame = webdriver.By.css('#ck2 .cke_wysiwyg_frame');
  
  test.describe('Selenium tests', function() {
    test.it("Editor with initial content", function () {

      driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .build();
      driver.get('http://127.0.0.1:8080/testck.html?rev=2&content=<p>qwe</p>');

      utils.waitFor(driver, ck1Frame, ck2Frame);

      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();
      driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();

      utils.getCKData(driver, ck1Frame, function (value) {
        assert.equal(utils.removeLineBreaks(value), '<p>qwe</p>');
      });

      utils.getCKData(driver, ck2Frame, function (value) {
        assert.equal(utils.removeLineBreaks(value), '<p>qwe</p>');
      });
      
      driver.findElement(webdriver.By.css('.ck-content')).getAttribute('value').then(function(value) {
        assert.equal(utils.removeLineBreaks(value), '<p>qwe</p>');
      });
      
      driver.switchTo().frame(driver.findElement(ck1Frame));
      driver.findElement(webdriver.By.tagName('body')).sendKeys("a");
      driver.switchTo().defaultContent();
      driver.findElement(webdriver.By.css('#ck1 .ck-action-update')).click();
      driver.findElement(webdriver.By.css('#ck2 .ck-action-update')).click();

      utils.getCKData(driver, ck1Frame, function (value) {
        assert.equal(utils.removeLineBreaks(value), '<p>aqwe</p>');
      });

      utils.getCKData(driver, ck2Frame, function (value) {
        assert.equal(utils.removeLineBreaks(value), '<p>aqwe</p>');
      });
      
      driver.findElement(webdriver.By.css('.ck-content')).getAttribute('value').then(function(value) {
        assert.equal(utils.removeLineBreaks(value), '<p>aqwe</p>');
      });
      
      driver.quit();
    });
  
  });
  
}).call(this);