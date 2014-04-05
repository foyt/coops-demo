(function() {
  
  $.widget("custom.notifications", {
    
    _create: function () {
      $(this.element)
        .addClass('notifications')
        .append(
            $('<div>').addClass('notifications-container')
        );
    },
    
    notification: function (status, message) {
      var element = $('<div>').addClass('notification').text(message).click($.proxy(this._onNotificationClick, this));
      element.addClass('notification-' + status);
      $(this.element).find('.notifications-container').append(element);
      return element;
    },
    
    hideNotification: function (element) {
      $(element).hide('blind');
    },
    
    _onNotificationClick: function (event) {
      this.hideNotification(event.target);
    },
    
    _destroy : function() {
      
    }
    
  });
  
  $(document).ready(function() {
    $('.notifications').notifications();
  });
    
}).call(this);