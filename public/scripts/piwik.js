(function() {
  /* global Piwik, PIWIK_URL, PIWIK_SITEID*/
  'use strict';
  
  if ((typeof PIWIK_URL) !== 'undefined') {
    try {
      var piwikTracker = Piwik.getTracker(PIWIK_URL + "piwik.php", PIWIK_SITEID);
      piwikTracker.trackPageView();
      piwikTracker.enableLinkTracking();
    } catch (err) { }
  }
  
}).call(this);