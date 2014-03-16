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
  
  function getCKData(driver, frame, callback) {
    driver.switchTo().frame(driver.findElement(frame));
    var element = driver.findElement(webdriver.By.css('.cke_editable'));
    element.then(function (element) {
      element.getInnerHtml().then(function (innerHtml) {
        driver.switchTo().defaultContent();
        callback(innerHtml);
      });
    });
  }

  module.exports = {
    waitFor: waitFor,
    getCKData: getCKData
  };
  
}).call(this);