<?php
/**
 * @author ProudCity
 */

use Proud\Core;

class SearchBox extends Core\ProudWidget {

  public $search_name = 'term';
  public $action =  'search';
  public $provider = 'google';

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
        '#default_value' => 'How may we help you?',
        '#description' => 'What should the search box display',
        '#to_js_settings' => false
      ]
    ];
  }

  public function enqueueFrontend() {
    $path = plugins_url('../includes/js/',__FILE__);
    wp_enqueue_script( 'typewatch', $path . 'jquery.typewatch.js', [ 'jquery' ], false, true );
    wp_enqueue_script( 'wp-proud-search', $path . 'wp-proud-search.js', [ 'typewatch' ], false, true );
    wp_register_style( 'wp-proud-search', $path . '../css/wpss-search-suggest.css', [] );
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

    $query = empty($_REQUEST[$this->id]) ? '' : $_REQUEST[$this->id];

    ?>
    <form class="form-inline get-started search-form align-left" id="wrapper-search" style="margin-top:30px" action="<?php print $this->action; ?>">

      <div class="input-group">
        <input 
          id="proud-search-input" class="form-control input-lg" type="text" autocomplete="off"
          placeholder="<?php print $instance['placeholder']; ?>" 
          name="<?php print $this->name; ?>" 
          value="<?php print $query; ?>"
        >
        <span class="input-group-btn">
          <button type="submit" value="Go" class="btn btn-primary btn-lg" id="proud-search-submit"><i class="fa fa-search"></i></button>
        </span>
      </div>
      <ul id="proud-search-autocomplete" class="search-autosuggest"></ul>
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