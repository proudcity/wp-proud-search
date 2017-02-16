<?php the_widget('SearchBox'); ?>
<?php echo apply_filters( 'proud_search_page_message', '' ); ?>
<h3>Results</h3>
<?php $search_results->print_list(); ?>