
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

      if(settings.proud_actions_app && settings.proud_actions_app.global.search_granicus_site) {
        // settings.proud_actions_app.global.search_granicus_site
        Proud.behaviors.granicus_search = function(newValue) {
          console.log(settings);
          console.log(this);
        }.bind(settings);
      }

      var location = window.location.protocol + '//' + window.location.hostname + window.location.pathname;
  
      var $body = $('body'),
          searchPage = $body.hasClass('search-site'); // on search page?

      // analytics for search page
      if(searchPage) {
        $body.once('proud-search-ga', function() {
          // Send page view
          ga('send', {
            hitType: 'event',
            eventCategory: 'SearchCustom',
            eventLabel: settings.proud_search.global.search_term,
            eventAction: location
          });

          // setup results clicks
          $('.search-title a').click(function(e) {
            ga('send', {
              hitType: 'event',
              eventCategory: 'SearchCustomClick',
              eventLabel: e.target.text,
              eventAction: e.target.href
            });
          });
        });
      }

      // Init Angular Search module
      var $searchForm = $('#wrapper-search');
      if($searchForm.length && !$searchForm.hasClass('ng-scope')) {
        angular.module('proudSearchParent', [
          'ProudBase',
          'ProudSearch'
        ]);
        angular.bootstrap( $searchForm, ['proudSearchParent']);
      }

      var searchTabTimer = null;

      // Search box in content (not overlay)
      // Attach overlay open
      $(".wrap #wrapper-search").once('proud-search', function() {
        // if search page, override class
        var classOverride = null;
        $(this).on('focusin', function() {
          if (searchTabTimer) {
            clearTimeout(searchTabTimer);
          }
          if(!$body.hasClass('search-active') && !$body.hasClass('search-active-lite')) {
            Proud.proudNav.triggerOverlay('search', null, classOverride);
          }
        }).on('focusout', function() {
          searchTabTimer = setTimeout(function() {
            Proud.proudNav.closeLayers(['search']);
          }, 1);
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
            event.callback(true, false, false, false, function() {
              focusSearchInput();
            } );
            break;
        }
      });
    }
  };
})(jQuery, Proud);
