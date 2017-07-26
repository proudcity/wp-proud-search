<?php
/**
 * @author ProudCity
 */

use Proud\Core;

class SearchBox extends Core\ProudWidget {

  function __construct() {
    parent::__construct(
      'proud_search_box', // Base ID
      __( 'Search Box', 'wp-proud-search' ), // Name
      array( 'description' => __( 'Autocomplete search', 'wp-proud-search' ), ) // Args
    );
  }

  function initialize() {
    $this->settings = [
      'placeholder' => [
        '#title' => 'Placeholder text',
        '#type' => 'text',
        '#default_value' => 'How can we help you?',
        '#description' => 'What should the search box display',
        '#to_js_settings' => false
      ]
    ];
  }

  public function enqueueFrontend() {
    $path = plugins_url('../includes/js/',__FILE__);
    // wp_enqueue_script( 'typewatch', $path . 'jquery.typewatch.js', [ 'jquery' ], false, true );
    wp_enqueue_script( 'wp-proud-search', $path . 'wp-proud-search.js', [ 'proud-actions-app' ], false, true );
    // wp_register_style( 'wp-proud-search', $path . '../css/wpss-search-suggest.css', [] );
  }

  /**
   * Front-end display of widget.
   *
   * @see WP_Widget::widget()
   *
   * @param array $args     Widget arguments.
   * @param array $instance Saved values from database.
   */
  public function printWidget( $args, $instance ) {

    // We are rendering
    $GLOBALS['proud_search_box_rendered'] = true;

    global $proudsearch;
    $get_page_info = $proudsearch::get_search_page();
    $url = get_permalink( $get_page_info->ID );
    // Filter the search page url. Used for multi-language search forms.
    $url = apply_filters( 'proud_filter_search_page_url', $url, $get_page_info->ID );
    // Get active search
    $query = empty($_REQUEST[$proudsearch::_SEARCH_PARAM]) ? '' : $_REQUEST[$proudsearch::_SEARCH_PARAM];

    ?>
    <form method="post" class="form-inline get-started search-form align-left" id="wrapper-search" style="margin-top:30px" action="">
      <?php wp_nonce_field($proudsearch::_SEARCH_NONCE); ?>
      <div ng-controller="searchBoxController" class="input-group">
        <label for="proud-search-input" class="sr-only">Search Site</label>
        <input 
          id="proud-search-input" class="form-control input-lg" type="text"
          ng-model="term" ng-model-options='{ debounce: 250 }' ng-change='searchSubmit()'
          placeholder="<?php print $instance['placeholder']; ?>" 
          name="<?php print 'search_' . $proudsearch::_SEARCH_PARAM; ?>" 
          value="<?php print $query; ?>"
        >
        <span class="input-group-btn">
          <button type="submit" value="Go" class="btn btn-primary btn-lg" id="proud-search-submit"><i aria-hidden="true" class="fa fa-search"></i><span class="sr-only">Search</span></button>
        </span>
      </div>
      <div class="search-autosuggest-wrap">
        <results-wrap show-additional="true"></results-wrap>
      </div>
    </form>
    <?php
  }
}

// register Foo_Widget widget
// -----------------------------
function register_search_box_widget() {
  register_widget( 'SearchBox' );
}
add_action( 'widgets_init', 'register_search_box_widget' );