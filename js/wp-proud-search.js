jQuery( function( $ ) {

  var proud_autocomplete = function(value, selector) {
    selector = selector == undefined ? '#s' : selector;
    proud_search_options.params.q = $(selector).val();
    console.log(proud_search_options);
    $.ajax({
      url: proud_search_options.url,
      data: proud_search_options.params,
      success: function(data) {
        $wrapper = $(selector).parent(); //@todo: fix
        $wrapper.html('');
        if (data.length) {
          $.each(data, function( index, item ) {
            if (index < proud_search_options.max_results) {
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
                      alert('@todo: overlay!');
                      //Drupal.proudNav.triggerOverlay(data, hash);
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

  $("#s").typeWatch( options );

  //$(".panel-display #proud-search-input").once('proud-search', function() {
    $(this).on('focus', function() {
      if(!$body.hasClass('search-active')) {
        Drupal.proudNav.triggerOverlay('search');
      }
    });
  //});

  $body.on('proudNavClick', function(event) {
    switch(event['event']) {
      case 'search':
        var $searchForm = $('#wrapper-search');
        if(!settings.proud_search.render_in_overlay) {
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
});