(function() {
  /* global hex_md5 */
  
  $.widget("custom.collaborators", {
    
    _create: function () {
    },
    
    addCollaborator: function (name, email) {
      $(this.element).append(
        $('<div>').collaborator({
          name: name,
          email: email
        })
      );
    },
    
    _destroy : function() {
      
    }
  });
  
  $.widget("custom.collaborator", {
    options: {
      gravatarDefault: 'retro',
      gravatarRating: 'g',
      gravatarSize: 32
    },
    _create: function () {
      $(this.element)
        .addClass('collaborator')
        .append($('<img>')
          .attr("title", this.options.name)
          .attr('src', '//www.gravatar.com/avatar/' +
              hex_md5(this.options.email) +
              '?d=' + this.options.gravatarDefault +
              '&r=' + this.options.gravatarRating +
              "&s=" + this.options.gravatarSize)
          );
    },
    
    _destroy : function() {
      
    }
  });
    
}).call(this);