'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runNavClick, runContentFocus } = require('./helpers/harness.js');

/**
 * #2948: on iOS Safari, focusing the hero search input while the page is
 * scrolled (or after the keyboard pans the visual viewport) leaves the
 * position: fixed #wrapper-search sitting above the visible area. These tests
 * cover the scroll reset added to the in-content focus path.
 *
 * `#wrapper-search` only becomes `position: fixed` once `search-active` lands
 * on <body>, ~50ms after the focus handler calls triggerOverlay. So every
 * hero-path test below adds that class to the body FakeSet before invoking
 * the captured callback, to simulate openLayer's timer having already fired.
 */

test('resets scroll when the page was scrolled before a hero focus', () => {
  const { calls, ctx } = runContentFocus({}, [], { pageYOffset: 300 });
  ctx.setFor('body').classes.add('search-active');

  calls[0][4]();

  assert.equal(ctx.scrollToCalls.length, 1);
  assert.deepEqual(ctx.scrollToCalls[0], [0, 0]);
});

test('visual viewport offset resets scroll even on the toolbar path', () => {
  // offsetTop is the iOS keyboard pan. It must reset the layout regardless of
  // which entry point opened the overlay.
  const { calls, ctx } = runNavClick({}, ['search-active'], { offsetTop: 120 });

  calls[0][4]();

  assert.equal(ctx.scrollToCalls.length, 1);
  assert.deepEqual(ctx.scrollToCalls[0], [0, 0]);
});

test('fn ignores the pre-open call and resets on the post-open call', () => {
  // toggleOverlay calls fn synchronously from closeLayers before the class
  // exists, then again from openLayer once the 50ms timer adds it.
  const { calls, ctx } = runContentFocus({}, [], { offsetTop: 120 });
  const fn = calls[0][4];

  fn();
  assert.equal(ctx.scrollToCalls.length, 0, 'guard must skip the pre-open call');

  ctx.setFor('body').classes.add('search-active');
  fn();
  assert.equal(ctx.scrollToCalls.length, 1);
  assert.deepEqual(ctx.scrollToCalls[0], [0, 0]);
});

test('visualViewport resize resets scroll while the overlay is open', () => {
  const { ctx } = runContentFocus({}, [], { offsetTop: 150 });
  ctx.setFor('body').classes.add('search-active');

  ctx.visualViewport.emit('resize');

  assert.equal(ctx.scrollToCalls.length, 1);
  assert.deepEqual(ctx.scrollToCalls[0], [0, 0]);
});

test('visualViewport resize does nothing while the overlay is closed', () => {
  const { ctx } = runContentFocus({}, [], { offsetTop: 150 });

  ctx.visualViewport.emit('resize');

  assert.equal(ctx.scrollToCalls.length, 0);
});

test('hero focus at the top of the page does not scroll', () => {
  const { calls, ctx } = runContentFocus({}, []);
  ctx.setFor('body').classes.add('search-active');

  calls[0][4]();

  assert.equal(ctx.scrollToCalls.length, 0);
});

test('toolbar path does not reset scroll just because the page is scrolled', () => {
  // An unconditional pageYOffset reset would jump a scrolled page to the top
  // behind the overlay, so only the in-content path forces this.
  const { calls, ctx } = runNavClick({}, ['search-active'], { pageYOffset: 300 });

  calls[0][4]();

  assert.equal(ctx.scrollToCalls.length, 0);
});

test('the input keeps focus and is never blurred', () => {
  const { calls, ctx } = runContentFocus({}, [], { pageYOffset: 300 });
  ctx.setFor('body').classes.add('search-active');

  calls[0][4]();

  const $input = ctx.setFor('#proud-search-input');
  assert.equal($input.focusCount, 1);
  assert.equal($input.blurCount, 0, 'scrollTo must not blur the input on iOS');
});

test('resets scroll when visualViewport is unavailable', () => {
  const { calls, ctx } = runContentFocus({}, [], {
    pageYOffset: 300,
    noVisualViewport: true,
  });
  ctx.setFor('body').classes.add('search-active');

  assert.doesNotThrow(() => calls[0][4]());
  assert.equal(ctx.scrollToCalls.length, 1);
  assert.deepEqual(ctx.scrollToCalls[0], [0, 0]);
});
