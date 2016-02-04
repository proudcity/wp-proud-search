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
                    .bind('click', function(e) {
                      switch (item.type) {
                        case 'payment':
                        case 'report':
                        case 'question':
                          if(item.action_attr && item.action_hash) {
                            Proud.proudNav.triggerOverlay(item.action_attr, item.action_hash);
                          }
                          else if(item.action_attr) {
                            Proud.proudNav.triggerOverlay(item.action_attr);
                          }
                          else {
                            Proud.proudNav.triggerOverlay(item.type);
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
              $('<span>').html('Click <i class="fa fa-search fa-fw"></i> to search our site').appendTo($wrapper);
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

      var $body = $('body'),
          searchPage = $body.hasClass('search-site'); // on search page?

      // Type watch
      $("#proud-search-input").once('proud-search-ahead', function() {
        $(this).typeWatch( options );
      });

      // Search box in content (not overlay)
      // Attach overlay open
      $(".wrap #proud-search-input").once('proud-search', function() {
        // if search page, override class
        var classOverride = searchPage ? 'search-active-lite' : null;
        $(this).on('focus', function() {
          if(!$body.hasClass('search-active') && !$body.hasClass('search-active-lite')) {
            Proud.proudNav.triggerOverlay('search', null, classOverride);
          }
        });
      });

      function focusSearchInput() {
        if($body.hasClass('search-active') || $body.hasClass('search-active-lite')) {
          $('#proud-search-input').focus();
        }
      }

      $body.on('proudNavClick', function(event) {
        switch(event['event']) {
          case 'search':
            var $searchForm = $('#wrapper-search');
            // Should we scroll the window?
            if(!searchPage && !settings.proud_search_box.global.render_in_overlay) {
              // Mobile vs other offset
              var offset = window.matchMedia('(max-width: 481px)').matches
                         ? 0
                         : 100;
              event.callback(true, 'wrapper-search', offset, false, function() {
                focusSearchInput();
              } );
            }
            else {
              event.callback(true, false, false, false, function() {
                focusSearchInput();
              } );
            }
            break;
        }
      });
    }
  };
})(jQuery, Proud);