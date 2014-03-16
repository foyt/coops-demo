(function() {
    
  var webdriver = require('selenium-webdriver');

  function waitForBy(driver, by) {
    var found = false;
    
    driver.wait(function () {
      try {
        driver.findElements(by).then(function(elements) {
          if (elements.length === 1) {
            found = true;
          }
        });
      } catch (e) {
        console.log(e);
      }
      
      return found;
    }, 30000);
  }
  
  function waitFor(driver) {
    for (var i = 1, l = arguments.length; i < l; i++) {
      waitForBy(driver, arguments[i]);
    }
  }
  
  function assertEquals(expected, value, message) {
    if (expected !== value) {
      var error = 'Assertion failed, got: ' + value + ' but expected ' + expected;
      if (message) {
        error = message + ': ' + error;
      }
      
      throw new Error(error);
    }
  }

  function getCKData(driver, frame, callback) {
    driver.switchTo().defaultContent();
    driver.switchTo().frame(driver.findElement(frame));
    
    var element = driver.findElement(webdriver.By.css('.cke_editable'));
    element.then(function (element) {
      element.getInnerHtml().then(function (innerHtml) {
        callback(innerHtml);
      });
    });
  }
  
  function typeIntoCK(driver, frame, keys) {
    driver.switchTo().defaultContent();
    driver.switchTo().frame(driver.findElement(frame));
    driver.findElement(webdriver.By.css('.cke_editable')).sendKeys(keys);
  }
  
  function assertCKData (driver, frame, expected, message) {
    getCKData(driver, frame, function (text) {
      assertEquals(expected, text, message);
    });
  }

  module.exports = {
    waitFor: waitFor,
    assertEquals: assertEquals,
    getCKData: getCKData,
    typeIntoCK: typeIntoCK,
    assertCKData: assertCKData
  };
  
}).call(this);