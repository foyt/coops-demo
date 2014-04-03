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
    },
    
    _onNotificationClick: function (event) {
      $(event.target).hide('blind');
    },
    
    _destroy : function() {
      
    }
    
  });
  
  $(document).ready(function() {
    $('.notifications').notifications();
  });
    
}).call(this);