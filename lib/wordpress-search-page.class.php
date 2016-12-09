<?php
/**
 * @author ProudCity
 */

use Proud\Core;

class ProudWordpressSearch extends ProudSearchPage {

  function __construct() {
    parent::__construct();
  }
  
  public function search_content() {

    // Add scripts
    $search_results = new Core\TeaserList(
      'search', 
      'search', 
      array(
        'posts_per_page' => 20,
      ),
      true,
      null,
      true
    );
    ?>
    <?php the_widget('SearchBox'); ?>
    <?php echo apply_filters( 'proud_search_page_message', '' ); ?>
    <?php $search_results->print_list(); ?>
    <?php
  }
}