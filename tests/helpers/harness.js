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
    this.blurCount = 0;
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

  blur() {
    this.blurCount += 1;
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
  const viewport = opts.viewport || {};
  const pageYOffset = viewport.pageYOffset || 0;
  const offsetTop = viewport.offsetTop || 0;
  const noVisualViewport = viewport.noVisualViewport || false;

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

  const scrollToCalls = [];

  // Stand-in for window.visualViewport: iOS Safari fires 'resize' on this
  // object when the keyboard pans the page, separately from window scroll.
  const visualViewportHandlers = {};
  const visualViewport = {
    offsetTop,
    addEventListener(event, handler) {
      (visualViewportHandlers[event] = visualViewportHandlers[event] || []).push(
        handler
      );
    },
    emit(event) {
      (visualViewportHandlers[event] || []).forEach((handler) => handler());
    },
  };

  // Records the relative order of the #2948 keyboard-proxy steps against the
  // proudNavClick callback, since the point of the proxy is to run before
  // the 50ms openLayer timer that eventually invokes that callback.
  const order = [];

  // A throwaway <input> the script creates/focuses/removes for the keyboard
  // proxy. setAttribute/style/focus/remove are recorded so tests can inspect
  // them without a real DOM.
  const createdInputs = [];
  function makeFakeInput() {
    const el = {
      tagName: 'INPUT',
      type: '',
      attributes: {},
      style: {},
      focusCount: 0,
      parentNode: null,
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      focus() {
        this.focusCount += 1;
        documentStub.activeElement = this;
        order.push('proxyFocused');
      },
      remove() {
        if (this.parentNode) {
          this.parentNode.removeChild(this);
        }
      },
    };
    return el;
  }

  // Stand-in for document.body: just enough of appendChild/removeChild to
  // track what the script attached and whether it cleaned up after itself.
  const body = {
    children: [],
    appendChild(el) {
      el.parentNode = body;
      body.children.push(el);
      return el;
    },
    removeChild(el) {
      const index = body.children.indexOf(el);
      if (index !== -1) {
        body.children.splice(index, 1);
      }
      el.parentNode = null;
      return el;
    },
  };

  // Fakes setTimeout/clearTimeout so tests can fire the #2948 safety-removal
  // timer on demand instead of waiting on a real one.
  const timers = [];
  function fakeSetTimeout(fn, delay) {
    const timer = { fn, delay, fired: false, cleared: false };
    timers.push(timer);
    return timer;
  }
  function fakeClearTimeout(timer) {
    if (timer) {
      timer.cleared = true;
    }
  }
  function runTimers() {
    timers
      .filter((timer) => !timer.fired && !timer.cleared)
      .forEach((timer) => {
        timer.fired = true;
        if (!timer.cleared) {
          timer.fn();
        }
      });
  }

  // The toolbar search trigger the safety timeout hands focus back to.
  const searchTrigger = {
    focusCount: 0,
    focus() {
      this.focusCount += 1;
      documentStub.activeElement = this;
    },
  };

  const documentStub = {
    body,
    activeElement: null,
    querySelector(selector) {
      return selector === '[data-proud-navbar="search"]' ? searchTrigger : null;
    },
    // Additive: decodeEntities still gets its plain div at script load, the
    // #2948 proxy gets a recordable fake input.
    createElement(tagName) {
      if (tagName === 'input') {
        const el = makeFakeInput();
        createdInputs.push(el);
        order.push('proxyCreated');
        return el;
      }
      return { innerHTML: '', textContent: '' };
    },
  };

  const sandbox = {
    jQuery: $,
    Proud,
    lodash: require('./lodash-get.js'),
    angular: { module: () => {}, bootstrap: () => {} },
    document: documentStub,
    window: {
      location: { protocol: 'https:', hostname: 'example.test', pathname: '/' },
      pageYOffset: pageYOffset,
      scrollTo: (...args) => scrollToCalls.push(args),
      visualViewport: noVisualViewport ? undefined : visualViewport,
    },
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    console,
  };
  sandbox.window.document = sandbox.document;

  vm.runInNewContext(fs.readFileSync(SCRIPT_PATH, 'utf8'), sandbox, {
    filename: SCRIPT_PATH,
  });

  return {
    $,
    Proud,
    sets,
    setFor,
    sandbox,
    scrollToCalls,
    visualViewport,
    order,
    createdInputs,
    body,
    timers,
    runTimers,
    searchTrigger,
  };
}

/**
 * Run the proud_search behavior and return the calls its proudNavClick
 * handler makes back into proud-navbar's callback.
 *
 * @param {object} settings      Proud settings.
 * @param {string[]} bodyClasses Classes on <body>.
 * @param {object} [viewport]    pageYOffset / offsetTop / noVisualViewport.
 */
function runNavClick(settings, bodyClasses, viewport) {
  const ctx = load({ settings, bodyClasses, viewport });
  ctx.Proud.behaviors.proud_search.attach(ctx.sandbox.document, settings);

  const calls = [];
  ctx.setFor('body').emit('proudNavClick', {
    event: 'search',
    callback: (...args) => {
      ctx.order.push('eventCallback');
      calls.push(args);
    },
  });

  return { calls, ctx };
}

/**
 * Run the in-content (hero) focus path: stub triggerOverlay so it emits
 * proudNavClick the way proud-navbar's openLayer eventually does, then focus
 * the hero search input the way a native tap does.
 *
 * @param {object} settings       Proud settings.
 * @param {string[]} bodyClasses  Classes on <body>.
 * @param {object} [viewport]     pageYOffset / offsetTop / noVisualViewport.
 */
function runContentFocus(settings, bodyClasses, viewport) {
  const ctx = load({ settings, bodyClasses, viewport });
  ctx.Proud.behaviors.proud_search.attach(ctx.sandbox.document, settings);

  const calls = [];
  ctx.Proud.proudNav.triggerOverlay = () => {
    ctx.setFor('body').emit('proudNavClick', {
      event: 'search',
      callback: (...args) => {
        ctx.order.push('eventCallback');
        calls.push(args);
      },
    });
  };

  ctx.setFor('#proud-search-input').emit('focus');

  return { calls, ctx };
}

module.exports = { load, runNavClick, runContentFocus, FakeSet };
