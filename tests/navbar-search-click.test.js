'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runNavClick } = require('./helpers/harness.js');

/**
 * proud_seach_print_search() only renders the search box into the navbar
 * overlay when the page body has not already rendered one, and reports which
 * way it went through proud_search_box.global.render_in_overlay. The click
 * handler has to read that flag, or pages carrying their own search box open
 * an empty overlay.
 */

const IN_OVERLAY = {
  proud_search_box: { global: { render_in_overlay: true } },
};

const IN_PAGE = {
  proud_search_box: { global: { render_in_overlay: false } },
};

test('opens the overlay when the search box was rendered there', () => {
  const { calls } = runNavClick(IN_OVERLAY, []);

  assert.equal(calls.length, 1);
  const [open, scrollId, scrollOffset, forceClose] = calls[0];
  assert.equal(open, true, 'should ask proud-navbar to open the layer');
  assert.equal(scrollId, false, 'overlay is fixed, nothing to scroll to');
  assert.equal(scrollOffset, false);
  assert.equal(forceClose, false);
});

test('scrolls to the in-page search box instead of opening an empty overlay', () => {
  const { calls } = runNavClick(IN_PAGE, []);

  assert.equal(calls.length, 1);
  const [open, scrollId, scrollOffset, forceClose] = calls[0];
  assert.equal(open, false, 'overlay is empty on this page, so do not open it');
  assert.equal(scrollId, 'wrapper-search', 'should scroll to the in-page form');
  assert.equal(scrollOffset, 0);
  // Spread first: the array is built inside the vm realm, so its prototype is
  // not this realm's Array and deepEqual would reject an identical list.
  assert.deepEqual(
    [...forceClose],
    ['menu', 'search'],
    'close the mobile menu so the box is visible'
  );
});

test('does not open the overlay when the setting is absent', () => {
  // init_widgets() always emits the setting, so this is only reachable from a
  // stale cached page. Taking the in-page branch degrades to a no-op there --
  // proud-navbar skips a scroll target it cannot find, and focusSearchInput
  // bails on an empty set -- whereas opening would risk a blank panel.
  const { calls, ctx } = runNavClick({}, []);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], false);
  assert.equal(calls[0][1], 'wrapper-search');

  ctx.setFor('#proud-search-input').length = 0;
  assert.doesNotThrow(() => calls[0][4]());
});

test('focuses the in-page input without waiting for the overlay class', () => {
  const { calls, ctx } = runNavClick(IN_PAGE, []);

  const focusCallback = calls[0][4];
  assert.equal(typeof focusCallback, 'function');

  focusCallback();
  assert.equal(
    ctx.setFor('#proud-search-input').focusCount,
    1,
    'body never gets search-active on this path, so focus must be unconditional'
  );
});

test('only focuses the overlay input once the overlay is actually open', () => {
  const closed = runNavClick(IN_OVERLAY, []);
  closed.calls[0][4]();
  assert.equal(
    closed.ctx.setFor('#proud-search-input').focusCount,
    0,
    'no search-active class means the overlay never opened'
  );

  const open = runNavClick(IN_OVERLAY, ['search-active']);
  open.calls[0][4]();
  assert.equal(open.ctx.setFor('#proud-search-input').focusCount, 1);
});
