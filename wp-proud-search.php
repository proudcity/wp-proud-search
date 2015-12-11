<?php
/** wp-proud-search.php
 *
 * Plugin Name: WP Search Suggest
 * Plugin URI:  http://en.obenland.it/wp-proud-search/#utm_source=wordpress&utm_medium=plugin&utm_campaign=wp-proud-search
 * Description: Provides title suggestions while typing a search query, using the built in jQuery suggest script.
 * Version:     2.1.0
 * Author:      Konstantin Obenland
 * Author URI:  http://en.obenland.it/#utm_source=wordpress&utm_medium=plugin&utm_campaign=wp-proud-search
 * Text Domain: wp-proud-search
 * Domain Path: /lang
 * License:     GNU General Public License v2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 */


if ( ! class_exists( 'Proud_Wp_Plugins_v100' ) ) {
	require_once( 'proud-wp-plugins.php' );
}


class Proud_Search_Suggest extends Proud_Wp_Plugins_v100 {


	///////////////////////////////////////////////////////////////////////////
	// METHODS, PUBLIC
	///////////////////////////////////////////////////////////////////////////

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

		$this->hook( 'wp_ajax_wp-proud-search',        'ajax_response' );
		$this->hook( 'wp_ajax_nopriv_wp-proud-search', 'ajax_response' );
		$this->hook( 'wp_ajax_wpss-post-url',            'post_url' );
		$this->hook( 'wp_ajax_nopriv_wpss-post-url',     'post_url' );
		$this->hook( 'init', 9 ); // Set to 9, so they can easily be deregistered.
		$this->hook( 'wp_enqueue_scripts' );
	}


	/**
	 * Registers the script and stylesheet
	 *
	 * The scripts and stylesheets can easily be deregeistered be calling
	 * <code>wp_deregister_script( 'wp-proud-search' );</code> or
	 * <code>wp_deregister_style( 'wp-proud-search' );</code> on the init
	 * hook
	 *
	 * @author Konstantin Obenland
	 * @since  1.0 - 16.04.2011
	 * @access public
	 *
	 * @return void
	 */
	public function init() {
		$plugin_data = get_file_data( __FILE__, array( 'Version' => 'Version' ), 'plugin' );
		// @todo?: $suffix      = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '.dev' : '';
		$suffix = '';

		wp_register_script( $this->textdomain . 'typewatch', plugins_url( "js/jquery.typewatch$suffix.js", __FILE__ ), array(  ), $plugin_data['Version'], true );
		wp_register_script( $this->textdomain, plugins_url( "js/wp-proud-search$suffix.js", __FILE__ ), array( $this->textdomain . 'typewatch' ), $plugin_data['Version'], true );
		wp_localize_script( $this->textdomain, 'proud_search_options', array(
			'url'     => admin_url( 'admin-ajax.php' ),
			//'nonce'   => wp_create_nonce( 'wpss-post-url' ),
			'max_results' => 10,
			'params' => array(
				'action'   => $this->textdomain,
				'_wpnonce' => wp_create_nonce( $this->textdomain ),
			),
		) );

		wp_register_style( $this->textdomain, plugins_url( "css/wpss-search-suggest$suffix.css", __FILE__ ), array(), $plugin_data['Version'] );
	}


	/**
	 * Enqueues the script and style
	 *
	 * @author Konstantin Obenland
	 * @since  1.0 - 16.04.2011
	 * @access public
	 *
	 * @return void
	 */
	public function wp_enqueue_scripts() {
		wp_enqueue_script( $this->textdomain );
		wp_enqueue_style(  $this->textdomain );
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
		);

		//check_ajax_referer( $this->textdomain, '_wpnonce' );

		$s = trim( stripslashes( $_GET['q'] ) );

		$query_args = apply_filters( 'wpss_search_query_args', array(
			's'           => $s,
			'post_status' => 'publish',
		), $s );

		$query = new WP_Query( $query_args );

		if ( $query->posts ) {
			$out = array();
			foreach ($query->posts as $post) {
				$out[] = array(
					'weight' => $weights[$post->post_type]['weight'],
					'icon' => $meta[$post->post_type]['icon'], // @todo
					'title' => $post->post_title,
					'url' => $post->guid,
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


new Proud_Search_Suggest;


/* End of file wp-proud-search.php */
/* Location: ./wp-content/plugins/wp-proud-search/wp-proud-search.php */