<?php
/**
 * @author ProudCity
 */

abstract class ProudSearchPage {

  // Search template
  const _SEARCH_PAGE_TEMPLATE = 'wp-proud-search/search.php';

  // Search page slug
  const _SEARCH_PAGE_SLUG = 'search-site';

  function __construct() {
    // Add our template
    add_filter( 'template_include', [ $this, 'portfolio_page_template' ], 99 );
    // Create default page template for search results
    add_shortcode( 'proud_search_shortcode', [ $this, 'search_content' ] );
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

  public function search_content() {
    echo __("Override me please", 'proud-search');
  }
}