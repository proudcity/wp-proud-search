(function($, Proud) {
  Proud.behaviors.proud_search = {
    attach: function(context, settings) {

      var proud_autocomplete = function(value, selector) {
        selector = selector == undefined ? '#proud-search-autocomplete' : selector;
        settings.proud_search.global.params.q = $(selector).val();
        console.log(settings.proud_search.global);
        $.ajax({
          url: settings.proud_search.global.url,
          data: settings.proud_search.global.params,
          success: function(data) {
            $wrapper = $(selector); //@todo: fix
            $wrapper.html('');
            if (data.length) {
              $.each(data, function( index, item ) {
                if (index < settings.proud_search.global.max_results) {
                  var $item = $('<li>');
                  $('<a>').html('<i class="fa '+ item.icon +'"></i> ' + item.title).attr('href', item.url).bind('click', function(e) {
                    switch (item.type) {
                      case 'faq':
                      case 'payment':
                      case 'report':
                        var data, hash;
                        if(item.type == 'faq') {
                          data = 'answers';
                          hash = '/' + item['field_faq_category'][0]['id'] + '/' + item.nid; 
                        }
                        if(item.type == 'payment') {
                          data = 'payments';
                          hash = '/' + item.nid; 
                        }
                        if(data) {
                          Proud.proudNav.triggerOverlay(data, hash);
                        }
                        e.preventDefault();
                        break;

                      default:
                        if(item.url) {
                          window.location = item.url;
                        }
                        break;
                    }
                  }).prependTo($item);
                }
                if($item) {
                  $item.appendTo($wrapper);
                }

              });
            }
            else {
              $('<span>').html('Click <i class="fa fa-search fa-fw"></i> to search our site with Google').appendTo($wrapper);
            }
          }
        });
        
      }

      var options = {
        callback: proud_autocomplete,
        wait: 250,
        highlight: true,
        captureLength: 2
      }

      var $body = $('body');

      $("#proud-search-input").typeWatch( options );

      // Search box in content (not overlay)
      // Attach overlay open
      $(".wrap #proud-search-input").once('proud-search', function() {
        $(this).on('focus', function() {
          if(!$body.hasClass('search-active')) {
            Proud.proudNav.triggerOverlay('search');
          }
        });
      });

      $body.on('proudNavClick', function(event) {
        switch(event['event']) {
          case 'search':
            var $searchForm = $('#wrapper-search');
            if(!settings.proud_search_box.render_in_overlay) {
              var offset = window.matchMedia('(max-width: 481px)').matches
                         ? 0
                         : 100;
              event.callback(true, 'wrapper-search', offset);
            }
            else {
              event.callback(true);
            }
            break;
        }
      });
    }
  };
})(jQuery, Proud);