
// http://stackoverflow.com/a/9609450
var decodeEntities = (function() {
  // this prevents any overhead from creating the object each time
  var element = document.createElement('div');

  function decodeHTMLEntities (str) {
    if(str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }

    return str;
  }

  return decodeHTMLEntities;
})();

(function($, Proud) {

  Proud.behaviors.proud_search = {
    attach: function(context, settings) {

      // Goes to link or opens external
      var searchLinkClick = function (url) {
        if (settings.global.external_link_window) {
          if( !settings.global.external_regex.test(url) ) {
            window.open(url, '_blank');
            return false;
          }
        }
        return window.location = url;
      }

      var proud_autocomplete = function(value, selector) {
        selector = selector || '#proud-search-input';
        settings.proud_search.global.params.q = value || $(selector).val();
        var $wrapper = $('#proud-search-autocomplete');
        var location = window.location.protocol + '//' + window.location.hostname + window.location.pathname;
        location = location[0] != undefined ? location[0] : location;
        $.ajax({
          url: settings.proud_search.global.url,
          data: settings.proud_search.global.params,
          success: function(data) {
            ga('send', {
              hitType: 'event',
              eventCategory: 'SearchAutocomplete',
              eventLabel: settings.proud_search.global.params.q,
              eventAction: location,
              eventValue: 1
            });
            $wrapper.html('');
            if (data.length) {
              $.each(data, function( index, item ) {
                if (index < settings.proud_search.global.max_results) {
                  var $item = $('<li>');
                  // Escape html... WP adding escaping the & on the JSON output
                  item.url = decodeEntities(item.url);
                  $('<a>').html('<i class="fa '+ item.icon +'"></i> ' + item.title)
                    .attr({'href': item.url, 'class': 'result-link'})
                    .bind('click', function(e) {
                      ga('send', {
                        hitType: 'event',
                        eventCategory: 'SearchClick',
                        eventLabel: item.title,
                        eventAction: settings.proud_search.global.params.q,
                        eventValue: 1
                      });
                      ga('send', 'pageview', '/search-site/?term=' + settings.proud_search.global.params.q);
                      switch (item.type) {
                        // Action app content
                        case 'payment':
                        case 'issue':
                        case 'question':
                          // Just URL, so go to link
                          if(item.action_url) {
                            return searchLinkClick(item.action_url);;
                          }
                          // App + hash
                          else if(item.action_attr && item.action_hash) {
                            Proud.proudNav.triggerOverlay(item.action_attr, item.action_hash);
                          }
                          // App
                          else if(item.action_attr) {
                            Proud.proudNav.triggerOverlay(item.action_attr);
                          }
                          // Try item
                          else {
                            Proud.proudNav.triggerOverlay(item.type);
                          }
                          e.preventDefault();
                          return false;

                        default:
                          if(item.url) {
                            return searchLinkClick(item.url);
                          }
                          break;
                      }
                    }
                  ).prependTo($item).after(item.suffix ? item.suffix : '');
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
            // if(!searchPage && !settings.proud_search_box.global.render_in_overlay) {
            //   // Mobile vs other offset
            //   var offset, scrollId = 'wrapper-search';
            //   // $md-and-down from proud-patterns: mixins/media-queries
            //   if( window.matchMedia('(max-width: 991px)').matches ) {
            //     offset = 0;
            //     scrollId = false;
            //   }
            //   // are we large, and scrolled? 
            //   // $mq-nav-fixed-top from proud-patterns: mixins/media-queries.scss
            //   // also see  $nav-big-padding from proud-patterns: navbar.scss
            //   else if( window.matchMedia('(min-width: 1201px)').matches && !$body.hasClass('scrolled') ) {
            //     offset = 100 + (20 * 2) - 2;
            //   }
            //   else {
            //     offset = 100;
            //   }
            //   event.callback(true, scrollId, offset, false, function() {
            //     focusSearchInput();
            //   } );
            // }
            // else {
              
            // }
            event.callback(true, false, false, false, function() {
              focusSearchInput();
            } );
            break;
        }
      });
    }
  };
})(jQuery, Proud);