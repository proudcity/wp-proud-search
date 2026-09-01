'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runNavClick } = require('./helpers/harness.js');

/**
 * The search button must always ask proud-navbar to open the search layer,
 * whichever place the search box was rendered.
 *
 * It is tempting to read proud_search_box.global.render_in_overlay here and
 * skip opening when the page already printed its own box, because on those
 * pages #overlay-search comes through empty. That is a misreading of the
 * design: #overlay-search is only the backdrop. The `search-active` class the
 * open path adds is what promotes #wrapper-search to `position: fixed` above
 * that backdrop, wherever it happens to sit in the document:
 *
 *   .search-active #wrapper-search { position: fixed !important; z-index: 1051 }
 *   .search-active #overlay-search { z-index: 1050; opacity: 1 }
 *
 * Skipping the open leaves the form unpromoted and, worse, recurses: the
 * in-content focus handler below re-triggers on any jQuery .focus(), and its
 * `!search-active` guard only ever clears because nothing added the class.
 */

const IN_OVERLAY = {
  proud_search_box: { global: { render_in_overlay: true } },
};

const IN_PAGE = {
  proud_search_box: { global: { render_in_overlay: false } },
};

test('opens the search layer when the box is in the overlay', () => {
  const { calls } = runNavClick(IN_OVERLAY, []);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], true, 'should ask proud-navbar to open the layer');
});

test('still opens the layer when the box is in the page content', () => {
  // The regression this locks: the in-content form needs `search-active` to
  // be lifted over the backdrop, so this path must not be special-cased.
  const { calls } = runNavClick(IN_PAGE, []);

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0][0],
    true,
    'search-active is what promotes the in-content form, so open regardless'
  );
});

test('does not scroll or force layers closed', () => {
  const { calls } = runNavClick(IN_PAGE, []);
  const [, scrollId, scrollOffset, forceClose] = calls[0];

  assert.equal(scrollId, false, 'the form is fixed to the viewport, not scrolled to');
  assert.equal(scrollOffset, false);
  assert.equal(forceClose, false, 'forcing a close here re-enters the click handler');
});

test('focuses the input only once the layer is actually open', () => {
  const closed = runNavClick(IN_OVERLAY, []);
  closed.calls[0][4]();
  assert.equal(
    closed.ctx.setFor('#proud-search-input').focusCount,
    0,
    'no search-active class means the layer never opened'
  );

  const open = runNavClick(IN_OVERLAY, ['search-active']);
  open.calls[0][4]();
  assert.equal(open.ctx.setFor('#proud-search-input').focusCount, 1);
});

test('the search-active guard is what stops the focus feedback loop', () => {
  // jQuery's .focus() is .trigger('focus'), which fires the in-content focus
  // handler whether or not the element already had focus. That handler calls
  // triggerOverlay('search') unless `search-active` is set, so the class is
  // load-bearing: focusing without it re-enters this same click handler.
  const ctx = runNavClick(IN_OVERLAY, ['search-active']).ctx;
  const inContentFocus = ctx.setFor('#proud-search-input').handlers.focus;

  assert.ok(inContentFocus && inContentFocus.length, 'focus handler is bound');

  let reentered = 0;
  ctx.Proud.proudNav.triggerOverlay = () => {
    reentered += 1;
  };
  ctx.setFor('#proud-search-input').emit('focus');

  assert.equal(reentered, 0, 'search-active must suppress the re-trigger');
});
