'use strict';

/**
 * Loads includes/js/wp-proud-search.js in a sandbox with just enough of
 * jQuery, lodash, Proud and Angular stubbed out to exercise the behavior.
 *
 * The script is a browser IIFE with no module boundary, so there is nothing to
 * require(). Running it through node:vm lets us hand it fake globals and then
 * pull the registered behavior back out.
 */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCRIPT_PATH = path.join(
  __dirname,
  '..',
  '..',
  'includes',
  'js',
  'wp-proud-search.js'
);

/**
 * A stand-in for a jQuery result set. Every method the script calls is either
 * chainable or records what it was asked to do, so assertions can read it back.
 */
class FakeSet {
  constructor(selector, options) {
    const opts = options || {};
    this.selector = selector;
    this.length = opts.length === undefined ? 1 : opts.length;
    this.classes = new Set(opts.classes || []);
    this.handlers = {};
    this.focusCount = 0;
    // Element-like member so `$input[0].selectionStart = ...` doesn't throw.
    this[0] = { selectionStart: 0, selectionEnd: 0 };
  }

  hasClass(name) {
    return this.classes.has(name);
  }

  on(event, handler) {
    (this.handlers[event] = this.handlers[event] || []).push(handler);
    return this;
  }

  off() {
    return this;
  }

  once(id, fn) {
    if (fn) {
      fn.call(this);
    }
    return this;
  }

  click(fn) {
    return this.on('click', fn);
  }

  focus() {
    this.focusCount += 1;
    return this;
  }

  find() {
    return new FakeSet('find', { length: 0 });
  }

  trigger() {
    return this;
  }

  /** Fire every handler registered for an event. */
  emit(event, arg) {
    (this.handlers[event] || []).forEach((handler) => handler.call(this, arg));
  }
}

/**
 * Build the sandbox and run the script in it.
 *
 * @param {object} options
 * @param {object} options.settings   Proud settings passed to attach().
 * @param {string[]} options.bodyClasses  Classes on <body>.
 * @returns {object} handles the tests assert against.
 */
function load(options) {
  const opts = options || {};
  const bodyClasses = opts.bodyClasses || [];

  const sets = new Map();
  const setFor = (selector) => {
    if (!sets.has(selector)) {
      const classes = selector === 'body' ? bodyClasses : [];
      sets.set(selector, new FakeSet(selector, { classes }));
    }
    return sets.get(selector);
  };

  const $ = (selector) => {
    // The script calls $(document) to bind delegated focusout handlers.
    if (typeof selector !== 'string') {
      return setFor('__document__');
    }
    return setFor(selector);
  };

  const Proud = {
    behaviors: {},
    proudNav: { triggerOverlay: () => {} },
  };

  const sandbox = {
    jQuery: $,
    Proud,
    lodash: require('./lodash-get.js'),
    angular: { module: () => {}, bootstrap: () => {} },
    document: { createElement: () => ({ innerHTML: '', textContent: '' }) },
    window: {
      location: { protocol: 'https:', hostname: 'example.test', pathname: '/' },
    },
    setTimeout,
    clearTimeout,
    console,
  };
  sandbox.window.document = sandbox.document;

  vm.runInNewContext(fs.readFileSync(SCRIPT_PATH, 'utf8'), sandbox, {
    filename: SCRIPT_PATH,
  });

  return { $, Proud, sets, setFor, sandbox };
}

/**
 * Run the proud_search behavior and return the calls its proudNavClick
 * handler makes back into proud-navbar's callback.
 *
 * @param {object} settings      Proud settings.
 * @param {string[]} bodyClasses Classes on <body>.
 */
function runNavClick(settings, bodyClasses) {
  const ctx = load({ settings, bodyClasses });
  ctx.Proud.behaviors.proud_search.attach(ctx.sandbox.document, settings);

  const calls = [];
  ctx.setFor('body').emit('proudNavClick', {
    event: 'search',
    callback: (...args) => calls.push(args),
  });

  return { calls, ctx };
}

module.exports = { load, runNavClick, FakeSet };
