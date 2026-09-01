'use strict';

/**
 * The script only uses lodash.get, and the plugin has no npm dependencies, so
 * stub the one method rather than pulling lodash into the test run.
 */
function get(object, path, fallback) {
  const parts = String(path).split('.');
  let current = object;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return fallback;
    }
    current = current[part];
  }

  return current === undefined ? fallback : current;
}

module.exports = { get };
