<?php
/*
Plugin Name:        Proud Search
Plugin URI:         http://getproudcity.com
Description:        ProudCity distribution
Version:            1.0.0
Author:             ProudCity
Author URI:         http://getproudcity.com

License:            MIT License
License URI:        http://opensource.org/licenses/MIT
*/

// namespace Proud\Search;

// Load Extendible
// -----------------------
if ( ! class_exists( 'ProudPlugin' ) ) {
  require_once( plugin_dir_path(__FILE__) . '../wp-proud-core/proud-plugin.class.php' );
}

// Init rendered var for actions overlay
$GLOBALS['proud_search_box_rendered'] = false;

class ProudSearch extends \ProudPlugin {

	// Search form nonce
	const _SEARCH_NONCE = 'proud_search_form_submit_nonce';
	// Search by
	const _SEARCH_PARAM = 'term';
	// Search provider?
	const _SEARCH_PAGE_PROVIDER = 'google';
	// Search provider object
  public static $provider;

	/**
	 * Constructor
	 *
	 * @author	Konstantin Obenland
	 * @since	1.0 - 16.04.2011
	 * @access	public
	 *
	 * @return	Obenland_Wp_Search_Suggest
	 */
	public function __construct() {

		parent::__construct( array(
			'textdomain'     => 'wp-proud-search',
			'plugin_path'    => __FILE__,
		) );

		// Load google search page ?
		if('google' == self::_SEARCH_PAGE_PROVIDER) {
			require_once( plugin_dir_path(__FILE__) . 'lib/google-search-page.class.php' );
			self::$provider = new ProudGoogleSearch;
		}

		// Load widgets
		$this->hook( 'plugins_loaded', 'init_widgets' );

		// Search submit
		$this->hook('init', 'process_search');

		// Endpoints
		$this->hook( 'wp_ajax_wp-proud-search',        'ajax_response' );
		$this->hook( 'wp_ajax_nopriv_wp-proud-search', 'ajax_response' );
		$this->hook( 'wp_ajax_wpss-post-url',            'post_url' );
		$this->hook( 'wp_ajax_nopriv_wpss-post-url',     'post_url' );
		
		// Print in overlay?
		$this->hook( 'proud_navbar_overlay_search', 'proud_seach_print_search');
	}

	// Process potential search input
	public function process_search() {
		// Do we have post?
		if(isset($_POST['_wpnonce']) && !empty($_POST['search_' . self::_SEARCH_PARAM])) {
			// See if input verifies
			if(wp_verify_nonce($_POST['_wpnonce'], self::_SEARCH_NONCE)) {
				$param = self::_SEARCH_PARAM . '=' . urlencode(sanitize_text_field($_POST['search_' . self::_SEARCH_PARAM]));
				$get_page_info = self::get_search_page();
  			$url = get_permalink( $get_page_info->ID );
  			$url .= strpos($url, '?') > 0 ? '&' : '?'; 
  			// echo ($url . $param);
  			wp_redirect( $url . $param );
  			exit();
			}
		}
	}

  // Init on plugins loaded
  public function init_widgets() {
  	// Check search
  	// $this->process_search();
  	// Load plugins
    require_once plugin_dir_path(__FILE__) . '/lib/search-box.class.php';

    // Add proud search settings
    global $proudcore;
    $proudcore->addJsSettings([
      'proud_search' => [
        'global' => [
		      'url'     => admin_url( 'admin-ajax.php' ),
		      //'nonce'   => wp_create_nonce( 'wpss-post-url' ),
		      'max_results' => 10,
		      'params' => array(
		        'action'   => 'wp-proud-search',
		        '_wpnonce' => wp_create_nonce( 'wp-proud-search' ),
		      ),
		   	]
			]
		]);
  }
  
  // Return the search page
  static function get_search_page() {
  	return self::$provider->get_search_page();
  }

  // Respond to navbar footer hook
  // Print widget if has not been rendered elsewhere
  public function proud_seach_print_search() {
    global $proudcore;
    // Add rendered variable to JS
    $proudcore->addJsSettings([
      'proud_search_box' => [
        'global' => [
          'render_in_overlay' => !$GLOBALS['proud_search_box_rendered']
        ]
      ]
    ]);
    // if not rendered on page yet, render in overlay
    if(!$GLOBALS['proud_search_box_rendered']) {
      the_widget('SearchBox');
    }
  }


	/**
	 * Handles the AJAX request for the search term.
	 *
	 * @author Konstantin Obenland
	 * @since  1.0 - 16.04.2011
	 * @access public
	 *
	 * @return void
	 */
	public function ajax_response() {
		$meta = array(
			'agencies' => array(
				'icon' => 'fa-university',
				'weight' => -8,
			),
			'payment' => array(
				'icon' => 'fa-card',
				'weight' => -9,
			),
			'question' => array(
				'icon' => 'fa-question',
				'weight' => -7,
			),
			'default' => array(
				'icon' => 'fa-page',
				'weight' => 1
			)
		);

		//check_ajax_referer( $this->textdomain, '_wpnonce' );

		$s = trim( stripslashes( $_GET['q'] ) );

		$query_args = apply_filters( 'wpss_search_query_args', array(
			's'           => $s,
			'post_status' => 'publish',
      'tax_query' => array()
		), $s );

		$query = new WP_Query( $query_args );

		if ( $query->posts ) {
			$out = array();
      // print_r();
			foreach ($query->posts as $post) {
        $post_type = $post->post_type;
        // Try to get tax
        if( $post_type == 'question' ) {
          // Term cache should already be primed by 'update_post_term_cache'.
          $terms = get_object_term_cache( $post->ID, 'faq-topic' );
          // Guess not
          if( empty( $terms ) ) {
              $post->fuck = 'me';
              $terms = wp_get_object_terms( $post->ID, 'faq-topic' );
              wp_cache_add( $post->ID, $terms, 'faq-topic' . '_relationships' );
          }
          // We got some hits
          if( !empty( $terms[0]->slug ) ) {
            $post->term = $terms[0]->slug;
          }
        }
      
				$post_settings = !empty($meta[$post_type]) ? $meta[$post_type] : $meta['default'];
				$out[] = array(
					'weight' => $post_settings['weight'],
					'icon' => $post_settings['icon'], // @todo
					'title' => $post->post_title,
					'url' => $post->guid,
          'type' => $post_type,
          'term' => !empty( $post->term ) ? $post->term : '',
          'slug' => $post->post_name
				);
			}
			//print_r($query->posts);
			//$results = apply_filters( 'wpss_search_results', wp_list_pluck( $query->posts, 'post_type' ), $query );

			wp_send_json($out);
		}

		wp_die();
	}

	/**
	 * Handles the AJAX request for a specific title.
	 *
	 * @author Konstantin Obenland
	 * @since  2.0.0 - 29.12.2013
	 * @access public
	 *
	 * @return void
	 */
	public function post_url() {
		check_ajax_referer( 'wpss-post-url' );

		global $wpdb;
		$post = $wpdb->get_var( $wpdb->prepare( "SELECT ID FROM $wpdb->posts WHERE post_title = %s LIMIT 1", trim( stripslashes($_REQUEST['title'] ) ) ) );

		if ( $post ) {
			echo get_permalink( $post );
		}

		wp_die();
	}
}  // End of class Obenland_Wp_Search_Suggest


$proudsearch = new ProudSearch;
$GLOBALS['proudsearch'] = $proudsearch;


/* End of file wp-proud-search.php */
/* Location: ./wp-content/plugins/wp-proud-search/wp-proud-search.php */