<?php the_widget('SearchBox'); ?>
<?php echo apply_filters( 'proud_search_page_message', '' ); ?>
<h2 class="h3">Results</h2>
<?php $search_results->print_list(); ?>