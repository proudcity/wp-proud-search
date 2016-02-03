<?php
/**
 * @author ProudCity
 */

class ProudGoogleSearch extends ProudSearchPage {

  // Add js?
  static $add_js;

  function __construct() {
    parent::__construct();
    // Load scripts
    add_action( 'wp_enqueue_scripts', [$this, 'registerScripts'] );
    add_action( 'wp_footer', [$this, 'printScripts'] );
  }

  public function registerScripts() {

    $cx = get_option('search_google_key', null);

    if (!empty($cx)) {
      $path = plugins_url('../includes/js/',__FILE__);
      wp_register_script( 'proud-google-search', $path . 'google-search.js', [], false, true);
      wp_localize_script( 'proud-google-search', 'proudcx', $cx );
    }
  }

  public function printScripts() {
    if (self::$add_js) {
      wp_print_scripts('proud-google-search');
    }
  }
  
  public function search_content() {
    // Add scripts
    self::$add_js = true;

    $search_que = '';
    if ( isset( $_GET['search'] ) ) {
      $search_que = $_GET['search'];
    }

    $ad_url        = admin_url();
    $get_page_info = $this->get_search_page();
    $url           = get_permalink( $get_page_info->ID );

    global $proudsearch;
    $variables['key'] = $proudsearch::_SEARCH_PARAM;
    ?>
    <?php the_widget('SearchBox'); ?>
    <gcse:searchresults-only></gcse:searchresults-only>
    <?php
  }
}