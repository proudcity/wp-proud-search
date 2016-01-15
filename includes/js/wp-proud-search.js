(function($, Proud) {
  Proud.behaviors.proud_search = {
    attach: function(context, settings) {

      var proud_autocomplete = function(value, selector) {
        selector = selector || '#proud-search-input';
        settings.proud_search.global.params.q = value || $(selector).val();
        var $wrapper = $('#proud-search-autocomplete');
        $.ajax({
          url: settings.proud_search.global.url,
          data: settings.proud_search.global.params,
          success: function(data) {
            $wrapper.html('');
            if (data.length) {
              $.each(data, function( index, item ) {
                if (index < settings.proud_search.global.max_results) {
                  var $item = $('<li>');
                  $('<a>').html('<i class="fa '+ item.icon +'"></i> ' + item.title)
                    .attr('href', item.url)
                    .attr('data-post-type', item.type)
                    .attr('data-post-term', item.term)
                    .attr('data-post-slug', item.slug)
                    .bind('click', function(e) {
                      switch (item.type) {
                        case 'payment':
                        case 'report':
                        case 'question':
                          var data, hash;
                          if(item.type == 'question') {
                            data = 'answers';
                            hash = '/' + item.term + '/' + item.slug;
                          }
                          if(item.type == 'payment') {
                            data = 'payments';
                            hash = '/' + item.nid; 
                          }
                          if(data) {
                            Proud.proudNav.triggerOverlay(data, hash);
                          }
                          e.preventDefault();
                          return false;

                        default:
                          if(item.url) {
                            window.location = item.url;
                          }
                          break;
                      }
                    }
                  ).prependTo($item);
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

      // Type watch
      $("#proud-search-input").once('proud-search-ahead', function() {
        $(this).typeWatch( options );
      });

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