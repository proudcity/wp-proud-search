<?php
/**
 * @author ProudCity
 */

class ProudGoogleSearch {

  // Search template
  const _SEARCH_PAGE_TEMPLATE = 'wp-proud-search/search.php';

  // Search page slug
  const _SEARCH_PAGE_SLUG = 'search-site';
  // Add js?
  static $add_js;

  function __construct() {
    // Add our template
    add_filter( 'template_include', [ $this, 'portfolio_page_template' ], 99 );
    // Create default page template for search results
    add_shortcode( 'proud_search_shortcode', [ $this, 'google_search_content' ] );
    // Load scripts
    add_action('wp_enqueue_scripts', [$this, 'registerScripts']);
    add_action('wp_footer', [$this, 'printScripts']);
  }

  public function portfolio_page_template( $template ) {

    if ( is_page( self::_SEARCH_PAGE_SLUG ) ) {
      $new_template = locate_template( self::_SEARCH_PAGE_TEMPLATE );
      if ( '' != $new_template ) {
        return $new_template;
      }
    }

    return $template;
  }

  /**
   * Retrieve or create the search page
   */
  public function get_search_page() {

    // Let other plugins (POLYLANG, ...) modify the search page slug
    $search_page_slug = apply_filters( 'proud_filter_search_page_slug', self::_SEARCH_PAGE_SLUG );

    // Search page is found by it's path (hard-coded).
    $search_page = get_page_by_path( $search_page_slug );

    if ( ! $search_page ) {

      $search_page = self::create_default_search_page();

    } else {

      if ( $search_page->post_status != 'publish' ) {

        $search_page->post_status = 'publish';

        wp_update_post( $search_page );
      }
    }


    return $search_page;
  }


  /**
   * Create a default search page
   *
   * @return WP_Post The search page
   */
  static function create_default_search_page() {

    // Let other plugins (POLYLANG, ...) modify the search page slug
    $search_page_slug = apply_filters( 'proud_filter_search_page_slug', self::_SEARCH_PAGE_SLUG );

    $_search_page = array(
      'post_type'      => 'page',
      'post_title'     => 'Search Results',
      'post_content'   => '[proud_search_shortcode]',
      'post_status'    => 'publish',
      'post_author'    => 1,
      'comment_status' => 'closed',
      'post_name'      => $search_page_slug
    );

    // Let other plugins (POLYLANG, ...) modify the search page
    $_search_page = apply_filters( 'proud_filter_before_create_search_page', $_search_page );

    $search_page_id = wp_insert_post( $_search_page );

    update_post_meta( $search_page_id, 'bwps_enable_ssl', '1' );

    return get_post( $search_page_id );
  }

  public function registerScripts() {

    $cx = '017437822142523782512:bu4twhruqou';//variable_get('proud_search_google_cx', NULL);

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
  
  public function google_search_content() {

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
    // $cx = '017437822142523782512:bu4twhruqou';//variable_get('proud_search_google_cx', NULL);

    // // if (!empty($cx)) {
    // //   proudcx
    // //   wp_localize_script( 'google-search', 'object_name', $aFoo ); //pass 'object_name' to script.js
    // // }
    // // else {
    // //   //drupal_set_message(t('You need to set up a !cse.', array('!cse' => l('Google Custom Search engine key', 'admin/proud/search'))), 'error');
    // // }

    ?>
    <?php the_widget('SearchBox'); ?>
    <gcse:searchresults-only></gcse:searchresults-only>
    <?php
  }
}