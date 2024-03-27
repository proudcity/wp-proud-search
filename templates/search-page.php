<?php the_widget('SearchBox'); ?><!-- templates/search-page.php -->
<?php echo apply_filters( 'proud_search_page_message', '' ); ?>
<h2 class="h3"><?php echo absint( $search_results->get_total_found_posts() ); ?> Results Found</h2>
<?php $search_results->print_list(); ?>
