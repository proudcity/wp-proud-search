<?php
/*
Plugin Name:        Proud Search
Plugin URI:         http://getproudcity.com
Description:        ProudCity distribution
Version:            1.0.0
Author:             ProudCity
Author URI:         http://getproudcity.com

License:            Affero GPL v3
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
	public static $search_type = 'wordpress';
	// Search provider object
  public static $provider;

	/**
	 * Constructor
	 * @access	public
	 *
	 * @return	ProudSearch
	 */
	public function __construct() {

		parent::__construct( array(
			'textdomain'     => 'wp-proud-search',
			'plugin_path'    => __FILE__,
		) );
    // init search type with settings
    self::$search_type = get_option( 'search_service', self::$search_type );
    // Load parent
    require_once( plugin_dir_path(__FILE__) . 'lib/search-page.class.php' );
		// Load search style
		if( 'google' == self::$search_type ) {
			require_once( plugin_dir_path(__FILE__) . 'lib/google-search-page.class.php' );
			self::$provider = new ProudGoogleSearch;
		}
    else {
      require_once( plugin_dir_path(__FILE__) . 'lib/wordpress-search-page.class.php' );
      self::$provider = new ProudWordpressSearch;
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

    // ReST Integration
    $this->rest_router();
		
		// Print in overlay?
		$this->hook( 'proud_navbar_overlay_search', 'proud_seach_print_search' );

    // Filter unwanted searches
    // add_filter( 'pre_get_posts', array( $this, 'limit_post_types' ) );
  }

  // // Limit search results on search
  // public function limit_post_types($query) {
  //   if ( !empty ( $query->query['proud_search'] ) && !is_admin() ) {
  //     $query->set( 'post_type',  $this->search_whitelist() );
  //   }
  // }

  /**
   * Returns list of post types to be searched on
   *
   * @param bool $labels: should labels be returned with the whitelist?
   *
   * @return array
   */
  public function search_whitelist( $labels = false ) {
    // Build list of post types to ignore
    $to_filter = apply_filters( 'proud_search_exclude', [
      'attachment',
      'revision',
      'nav_menu_item',
      'event-recurring',
      'redirect_rule',
      'customize_changeset',
      'custom_css',
      'location'
    ] );
    // Filter out from total
    global $wp_post_types;
    // Get post types
    $to_be_filtered = apply_filters( 
      'proud_search_whitelist', 
      array_map( create_function( '$o', 'return $o->label;' ), $wp_post_types ) 
    );
    $whitelist = apply_filters( 'proud_search_whitelist', array_diff_key( $to_be_filtered, array_flip( $to_filter ) ) );
    return $labels 
         ? $whitelist 
         : array_keys( $whitelist );
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
          'search_term' => !empty( $_REQUEST[self::_SEARCH_PARAM] ) ? $_REQUEST[self::_SEARCH_PARAM] : null
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
   * Dumb-cached function returns meta values 
   */
  public function post_type_meta_values() {
    static $post_type_meta = null;
    if( null === $post_type_meta ) {
      $post_type_meta = apply_filters( 'proud_search_post_type_meta', [
        'agency' => [
          'icon' => 'fa-university',
          'weight' => -8,
        ],
        'event' => [
          'icon' => 'fa-calendar-o',
          'weight' => -3,
        ],
        'staff-member' => [
          'icon' => ' fa-user',
          'weight' => 2,
        ],
        'post' => [
          'icon' => ' fa-newspaper-o',
          'weight' => 2,
        ],
        'payment' => [
          'icon' => 'fa-credit-card',
          'weight' => -9,
        ],
        'issue' => [
          'icon' => 'fa-exclamation-triangle',
          'weight' => -5,
        ],
        'document' => [
          'icon' => 'fa-file-text-o',
          'weight' => -3,
        ],
        'question' => [
          'icon' => 'fa-question-circle',
          'weight' => -7,
        ],
        'proud_location' => [
          'icon' => 'fa-globe',
          'weight' => 2,
        ],
        'location' => [
          'icon' => 'fa-globe',
          'weight' => 2,
        ],
        'default' => [
          'icon' => 'fa-file-o',
          'weight' => 1
        ],
      ] );
    }
    return $post_type_meta;
  }

  /**
   * Returns formatting info for a post type
   */
  public function post_meta( $post_type ) {
    $post_type_meta = $this->post_type_meta_values();
    return !empty( $post_type_meta[$post_type] ) 
         ? $post_type_meta[$post_type] 
         : $post_type_meta['default'];
  }

  /** 
   * Build search post url
   */
  public function get_post_url ( $post ) { 
    // Build URL 
    if( $post->type === 'agency' ) {
      $url = ⁠⁠⁠⁠Agency\get_agency_permalink( $post );
    }
    else if( !empty( $post->action_url ) ) {
      $url = $post->action_url;
    }
    else {
      $url = esc_url( get_permalink( $post ) );
    }
    return apply_filters('proud_search_post_url', $url, $post);
  }

  /**
   * Returns formatted title link for search result
   */
  public function get_post_link( $post, $title = false ) {
    if(!$title) {
      $title = $post->post_title;
    }
    // Try to attach actions meta
    \Proud\ActionsApp\attach_actions_meta($post);

    $data_attr = '';
    // Add actions open?
    if( empty( $post->action_url ) && !empty( $post->action_attr ) ) {
      $data_attr = ' data-proud-navbar="' . $post->action_attr . '"';
    }
    // Add actions hash?
    if( !empty( $post->action_hash ) ) {
      $data_attr .= ' data-proud-navbar-hash="' . $post->action_hash . '"';
    }
    
    // Return link html filtered
    return str_replace( 
      array( '%href', '%attrs', '%text', '%append' ),
      apply_filters( 'proud_search_post_args', array( $this->get_post_url( $post ), $data_attr, $title, '' ), $post ), 
      '<span class="title-span"><a href="%href"%attrs rel="bookmark">%text</a></span>%append' 
    );
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
	public function ajax_response( $s, $return = 'json' ) {
		

		//check_ajax_referer( $this->textdomain, '_wpnonce' );

		$s = !empty($s) ? $s : trim( stripslashes( $_GET['q'] ) );

		$query_args = apply_filters( 'wpss_search_query_args', array(
			's'=> $s,
      'proud_search_ajax' => true,
      'post_type' => $this->search_whitelist(),
			'post_status' => 'publish'
		) );

		$query = new WP_Query( $query_args );

		if ( $query->posts ) {
			$out = array();
      // Run through results
			foreach ($query->posts as $post) {
        \Proud\ActionsApp\attach_actions_meta($post);
        $post_type = $post->post_type;
				$post_settings = $this->post_meta( $post_type );
				$out[] = apply_filters( 'proud_search_ajax_post', array(
					'weight'      => $post_settings['weight'],
					'icon'        => $post_settings['icon'], // @todo
					'title'       => $post->post_title,
          'type'        => $post_type,
          'action_attr' => !empty( $post->action_attr ) ? $post->action_attr : '',
          'action_hash' => !empty( $post->action_hash ) ? $post->action_hash : '',
          'action_url'  => !empty( $post->action_url ) ? $post->action_url : '', // currently only used for linked out
          'url'         => $this->get_post_url( $post ),
        ), $post );
			}
			if ($return === 'json'){
        wp_send_json($out);
        wp_die();
      } else {
        return $out;
      }
		}

		
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

  public function rest_router() {
    add_action( 'rest_api_init', function () {

      register_rest_route( 'wp/v2', '/search', array(
        'methods' => 'GET',
        'callback' => [$this, 'rest_get_search'],
        'args'            => array(
          'term' => array(
            'default' => '',
          )
   
        ),
        'permission_callback' => function () {
          return true;//current_user_can( 'activate_plugins' );
        }
      ) );
      
    } );
  }
  
  public function rest_get_search( $request ) {
    return $this->ajax_response( $request->get_param( 'term' ), 'return' );
  }
}  // End of class ProudSearch


$proudsearch = new ProudSearch;
$GLOBALS['proudsearch'] = $proudsearch;


/* End of file wp-proud-search.php */
/* Location: ./wp-content/plugins/wp-proud-search/wp-proud-search.php */