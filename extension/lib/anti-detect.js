/**
 * Amplify Auto Poster - Anti-Detection Utilities
 *
 * Shared human-like behavior patterns used by all automators.
 * Loaded BEFORE automator scripts so they can call window.__amplifyAntiDetect.*.
 *
 * NOTE on auto-like:
 *   Facebook/Threads/Instagram Terms of Service prohibit automated engagement
 *   (likes, comments, follows). Implementing it risks account suspension.
 *   The autoLikeFeed() stub is intentionally a no-op to preserve call sites.
 */
(function () {
  'use strict';

  if (window.__amplifyAntiDetect) {
    return; // already loaded
  }

  /**
   * Promise-based sleep.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * Random delay between actions to mimic human reaction time.
   * Default range 3-10s matches existing automator behavior.
   * @param {number} [minMs=3000]
   * @param {number} [maxMs=10000]
   * @returns {Promise<void>}
   */
  function humanDelay(minMs, maxMs) {
    var lo = (typeof minMs === 'number') ? minMs : 3000;
    var hi = (typeof maxMs === 'number') ? maxMs : 10000;
    return sleep(lo + Math.floor(Math.random() * (hi - lo)));
  }

  /**
   * Type text into an input/textarea char-by-char with variable speed.
   * Dispatches input event so React-controlled fields pick up the value.
   * @param {HTMLInputElement|HTMLTextAreaElement} element
   * @param {string} text
   * @param {number} [perCharMs=80]
   */
  async function humanType(element, text, perCharMs) {
    var baseMs = (typeof perCharMs === 'number') ? perCharMs : 80;
    if (!element) return;
    for (var i = 0; i < text.length; i++) {
      element.value = (element.value || '') + text[i];
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(baseMs + Math.random() * baseMs * 0.5);
    }
  }

  /**
   * Smooth scroll on a container or window to mimic human browsing.
   * @param {Window|HTMLElement} [target=window]
   * @param {number} [distance=300]
   */
  async function humanScroll(target, distance) {
    var t = target || window;
    var d = (typeof distance === 'number') ? distance : 300;
    var steps = 5 + Math.floor(Math.random() * 5);
    for (var i = 0; i < steps; i++) {
      t.scrollBy ? t.scrollBy(0, d / steps) : void 0;
      await sleep(100 + Math.random() * 150);
    }
  }

  /**
   * No-op stub. Auto-like disabled to comply with platform ToS.
   * Preserves call sites so automator code is unchanged.
   */
  async function autoLikeFeed() {
    // Intentionally disabled.
  }

  window.__amplifyAntiDetect = {
    sleep: sleep,
    humanDelay: humanDelay,
    humanType: humanType,
    humanScroll: humanScroll,
    autoLikeFeed: autoLikeFeed
  };
})();
