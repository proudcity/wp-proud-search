'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { runNavClick, runContentFocus } = require('./helpers/harness.js');

/**
 * #2948 (third bug): iOS Safari only raises the keyboard when focus() runs
 * synchronously inside the user's tap. The toolbar path loses that chain,
 * because openLayer adds `search-active` inside a 50ms setTimeout and only
 * then runs proudNavClick's callback, which is where $input.focus() lives.
 *
 * The fix focuses a throwaway proxy input synchronously in the tap, before
 * event.callback (and so before openLayer's timer) ever runs, then hands
 * focus to the real input and removes the proxy once the layer is open.
 */

test('toolbar open creates and focuses the proxy before event.callback runs', () => {
  const { ctx } = runNavClick({}, []);

  assert.equal(ctx.createdInputs.length, 1, 'one proxy input created');
  assert.equal(ctx.createdInputs[0].focusCount, 1, 'proxy is focused');
  assert.deepEqual(
    ctx.order,
    ['proxyCreated', 'proxyFocused', 'eventCallback'],
    'proxy must be created and focused before event.callback (and so before the 50ms timer)'
  );
});

test('callback run with the class present focuses the real input and removes the proxy', () => {
  const { calls, ctx } = runNavClick({}, []);

  assert.equal(ctx.body.children.length, 1, 'proxy attached to body');

  ctx.setFor('body').classes.add('search-active');
  calls[0][4]();

  assert.equal(ctx.setFor('#proud-search-input').focusCount, 1, 'real input focused');
  assert.equal(ctx.body.children.length, 0, 'proxy removed');
});

test('toolbar click while the overlay is already open creates no proxy', () => {
  const { ctx } = runNavClick({}, ['search-active']);

  assert.equal(ctx.createdInputs.length, 0);
  assert.equal(ctx.body.children.length, 0);
});

test('the hero (in-content) focus path creates no proxy', () => {
  const { ctx } = runContentFocus({}, []);

  assert.equal(ctx.createdInputs.length, 0);
  assert.equal(ctx.body.children.length, 0);
});

test('the proxy is safe for iOS: labelled, unfocusable by tab, no zoom, pinned to the top', () => {
  const { ctx } = runNavClick({}, []);
  const proxy = ctx.createdInputs[0];

  // It holds focus briefly, so it must not be aria-hidden (a focused hidden
  // element breaks VoiceOver); a label makes the brief announcement sensible.
  assert.equal(proxy.attributes['aria-hidden'], undefined);
  assert.equal(proxy.attributes['aria-label'], 'Search');
  assert.equal(proxy.attributes['tabindex'], '-1');
  assert.equal(proxy.style.position, 'fixed');
  assert.ok(
    parseInt(proxy.style.fontSize, 10) >= 16,
    'font-size must be at least 16px or iOS zooms on focus'
  );
});

test('a safety timeout removes the proxy if the overlay never opens', () => {
  const { ctx } = runNavClick({}, []);

  assert.equal(ctx.body.children.length, 1);

  ctx.runTimers();

  assert.equal(ctx.body.children.length, 0, 'proxy removed by the safety timeout');
});

/** The 1000ms proxy safety timers, in creation order. */
function safetyTimers(ctx) {
  return ctx.timers.filter((timer) => timer.delay === 1000);
}

test("an earlier tap's safety timeout does not remove a newer tap's proxy", () => {
  const { ctx } = runNavClick({}, []);

  // Second tap inside the 50ms window: the overlay still isn't open.
  ctx.setFor('body').emit('proudNavClick', {
    event: 'search',
    callback: () => {},
  });

  assert.equal(ctx.createdInputs.length, 2);
  assert.equal(ctx.body.children.length, 1, 'first proxy replaced');

  safetyTimers(ctx)[0].fn();

  assert.equal(ctx.body.children.length, 1, 'second proxy still attached');
  assert.equal(ctx.body.children[0], ctx.createdInputs[1]);
});

test('the safety timeout hands focus back to the toolbar search button when the proxy still has it', () => {
  const { ctx } = runNavClick({}, []);

  safetyTimers(ctx)[0].fn();

  assert.equal(ctx.body.children.length, 0, 'proxy removed');
  assert.equal(ctx.searchTrigger.focusCount, 1, 'focus returned to the trigger');
});

test('the safety timeout leaves focus alone when the proxy no longer has it', () => {
  const { ctx } = runNavClick({}, []);

  ctx.sandbox.document.activeElement = { focus() {} };
  safetyTimers(ctx)[0].fn();

  assert.equal(ctx.body.children.length, 0, 'proxy removed');
  assert.equal(ctx.searchTrigger.focusCount, 0, 'focus not moved');
});
