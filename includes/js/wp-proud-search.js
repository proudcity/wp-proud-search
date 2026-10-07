// http://stackoverflow.com/a/9609450
var decodeEntities = (function () {
  // this prevents any overhead from creating the object each time
  var element = document.createElement('div');

  function decodeHTMLEntities(str) {
    if (str && typeof str === 'string') {
      // strip script/html tags
      str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gim, '');
      str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gim, '');
      element.innerHTML = str;
      str = element.textContent;
      element.textContent = '';
    }

    return str;
  }

  return decodeHTMLEntities;
})();

(function ($, Proud) {
  Proud.behaviors.proud_search = {
    attach: function (context, settings) {
      if (
        settings.proud_actions_app &&
        settings.proud_actions_app.global.search_granicus_site
      ) {
        // settings.proud_actions_app.global.search_granicus_site
        Proud.behaviors.granicus_search = function (newValue) {
          console.log(settings);
          console.log(this);
        }.bind(settings);
      }

      var location =
        window.location.protocol +
        '//' +
        window.location.hostname +
        window.location.pathname;

      var $body = $('body'),
        searchPage = $body.hasClass('search-site'); // on search page?

      // analytics for search page
      if (searchPage) {
        $body.once('proud-search-ga', function () {
          if (typeof ga === 'undefined') {
            return;
          }
          // Send page view
		  /**
			* @todo remove this kept around as reference during switch to new GA4
			* method below. Has no ulitity after we verify this works
          ga('send', {
            hitType: 'event',
            eventCategory: 'SearchCustom',
            eventLabel: settings.proud_search.global.search_term,
            eventAction: location,
          });
			*/

			gtag( 'event', 'pcsearch', {
				'hitType': 'event',
				'eventCategory': 'SearchCustom',
				'eventabel': settings.proud_search.global.search_term,
				'eventAction': location,
			});

          // setup results clicks
          $('.search-title a').click(function (e) {
			  /**
				* @todo remove this kept around as reference during switch to new GA4
				* method below. Has no ulitity after we verify this works
            ga('send', {
              hitType: 'event',
              eventCategory: 'SearchCustomClick',
              eventLabel: e.target.text,
              eventAction: e.target.href,
            });
			  **/

			gtag( 'event', 'pcsearchtitleclick', {
				'hitType': 'event',
				'eventCategory': 'SearchCustomClick',
				'eventabel': e.target.text,
				'eventAction': e.target.href,
			});
          });
        });
      }

      // Init Angular Search module
      var $searchForm = $('#wrapper-search');
      if ($searchForm.length && !$searchForm.hasClass('ng-scope')) {
        angular.module('proudSearchParent', ['ProudBase', 'ProudSearch']);
        angular.bootstrap($searchForm, ['proudSearchParent']);
      }

      /**
       * Once we're selected, make sure we close once focus is lost
       * @param {*} e
       */
      function focusCheck(e) {
        if (!$('#wrapper-search').find(e.relatedTarget || e.target).length) {
          if (
            $body.hasClass('search-active') ||
            $body.hasClass('search-active-lite')
          ) {
            Proud.proudNav.triggerOverlay('search', null, null);
          }

          // clear focusCheck
          $(document).off('focusout', '#wrapper-search', focusCheck);
        }
      }

      // Set when the hero (in-content) box starts the open, so proudNavClick
      // knows which path opened the overlay once its callback runs.
      var openedFromContent = false;

      // #2948: iOS Safari pans the *visual* viewport to keep a focused input
      // above the keyboard, but `search-active #wrapper-search` is
      // `position: fixed`, which tracks the *layout* viewport. After the pan
      // (or after a prior page scroll) the fixed box sits above the visible
      // area. Reset back to the origin so layout and visual viewport line up
      // again.
      function resetViewport(force) {
        if (window.visualViewport && window.visualViewport.offsetTop > 0) {
          window.scrollTo(0, 0);
        } else if (force && window.pageYOffset > 0) {
          window.scrollTo(0, 0);
        }
      }

      // #2948: the toolbar path's $input.focus() below runs inside
      // openLayer's 50ms class-add callback, which is outside the tap that
      // triggered it, so iOS Safari gives the real input focus but no
      // keyboard. Focus a throwaway proxy synchronously in the tap instead,
      // pinned to the top so there's nothing to pan, then hand focus to the
      // real input once the layer is open and remove the proxy.
      var searchKeyboardProxy = null;

      // Idempotent: both the normal open path and the safety timeout below
      // can call this, and only the first should do anything.
      function closeSearchKeyboardProxy() {
        if (searchKeyboardProxy && searchKeyboardProxy.parentNode) {
          searchKeyboardProxy.parentNode.removeChild(searchKeyboardProxy);
        }
        searchKeyboardProxy = null;
      }

      function openSearchKeyboardProxy() {
        // A second tap inside the 50ms window would otherwise orphan the
        // first proxy.
        closeSearchKeyboardProxy();

        var proxy = document.createElement('input');
        proxy.type = 'text';
        // Not aria-hidden: it holds focus briefly, and a focused hidden
        // element confuses VoiceOver. A label keeps the announcement sensible.
        proxy.setAttribute('aria-label', 'Search');
        proxy.setAttribute('tabindex', '-1');
        proxy.style.position = 'fixed';
        proxy.style.top = '0';
        proxy.style.left = '0';
        proxy.style.opacity = '0';
        proxy.style.fontSize = '16px'; // below 16px, iOS zooms on focus
        proxy.style.width = '1px';
        proxy.style.height = '1px';
        proxy.style.pointerEvents = 'none';

        document.body.appendChild(proxy);
        proxy.focus();
        searchKeyboardProxy = proxy;

        // Safety net: if the open gets cancelled before the callback below
        // ever sees the class, nothing else removes the proxy. Only touch
        // this tap's proxy, so an earlier tap's timer can't remove a newer
        // one, and hand focus back to the search button rather than letting
        // it fall to body.
        setTimeout(function () {
          if (searchKeyboardProxy !== proxy) {
            return;
          }
          var hadFocus = document.activeElement === proxy;
          closeSearchKeyboardProxy();
          if (hadFocus) {
            var trigger = document.querySelector('[data-proud-navbar="search"]');
            if (trigger) {
              trigger.focus();
            }
          }
        }, 1000);
      }

      // Search box in content (not overlay)
      // Attach overlay open
      $('.wrap #wrapper-search').once('proud-search', function () {
        $('#proud-search-input').on('focus', function () {
          if (
            !$body.hasClass('search-active') &&
            !$body.hasClass('search-active-lite')
          ) {
            openedFromContent = true;
            Proud.proudNav.triggerOverlay('search', null, null);

            // Watch for out of focus
            $(document).off('focusout', '#wrapper-search', focusCheck);
            $(document).on('focusout', '#wrapper-search', focusCheck);
          }
        });

        // The keyboard pan can land after proudNavClick's callback has
        // already run (iOS keyboard animation is ~250-300ms), so also catch
        // it directly. Gated on offsetTop, which is 0 on desktop, so desktop
        // resizes never scroll.
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', function () {
            if (
              (
                $body.hasClass('search-active') ||
                $body.hasClass('search-active-lite')
              ) &&
              window.visualViewport.offsetTop > 0
            ) {
              window.scrollTo(0, 0);
            }
          });
        }
      });

      $body.on('proudNavClick', function (event) {
        switch (event['event']) {
          case 'search':
            var fromContent = openedFromContent;
            openedFromContent = false;

            // #2948: only the toolbar path needs the proxy. The hero path
            // already has native focus inside the gesture, and skip it when
            // the overlay is already open (this click is closing it).
            if (
              !fromContent &&
              !$body.hasClass('search-active') &&
              !$body.hasClass('search-active-lite')
            ) {
              openSearchKeyboardProxy();
            }

            event.callback(true, false, false, false, function () {
              if (
                $body.hasClass('search-active') ||
                $body.hasClass('search-active-lite')
              ) {
                var $input = $('#proud-search-input');
                $input.focus();
                closeSearchKeyboardProxy();
                // Put at end
                setTimeout(function () {
                  $input[0].selectionStart = $input[0].selectionEnd = 10000;
                }, 0);

                // Force the reset on the in-content path only: the toolbar
                // path shares this same callback, and an unconditional
                // pageYOffset reset would jump a scrolled page to the top
                // behind the overlay.
                resetViewport(fromContent);

                // Watch for out of focus
                $(document).off('focusout', '#wrapper-search', focusCheck);
                $(document).on('focusout', '#wrapper-search', focusCheck);
              }
            });
            break;
        }
      });
    },
  };
})(jQuery, Proud);
