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
   * Type text into an input/textarea or contenteditable element char-by-char.
   * Tries multiple strategies in order so React/Lexical editors (FB, Threads)
   * pick up the change as if a human typed it:
   *   1) document.execCommand('insertText') — bypasses React's synthetic event
   *      system by inserting text at the caret in the document selection.
   *   2) Fallback: direct .value update + input event (works for plain inputs
   *      but is unreliable on React-controlled fields — kept as last resort).
   *
   * @param {HTMLInputElement|HTMLTextAreaElement|HTMLElement} element
   * @param {string} text
   * @param {number} [perCharMs=80]
   */
  async function humanType(element, text, perCharMs) {
    var baseMs = (typeof perCharMs === 'number') ? perCharMs : 80;
    if (!element || !text) return;

    // Focus first — execCommand('insertText') requires the element to be focused
    // and (for contenteditable) the cursor placed in the document.
    try { element.focus(); } catch (_) { /* ignore */ }

    var isContentEditable = element.isContentEditable ||
      (element.getAttribute && element.getAttribute('contenteditable') === 'true');

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];

      if (isContentEditable) {
        var sel = window.getSelection();
        if (sel && sel.rangeCount === 0) {
          var range = document.createRange();
          range.selectNodeContents(element);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        try {
          var ok = document.execCommand('insertText', false, ch);
          if (ok) {
            await sleep(baseMs + Math.random() * baseMs * 0.5);
            continue;
          }
        } catch (_) { /* fall through */ }

        // Keyboard event fallback — React/Lexical editors listen for keydown/keypress
        // which trigger internal state updates even in synthetic environments.
        var lastChar = (i === text.length - 1);
        element.dispatchEvent(new KeyboardEvent('keydown', { key: ch, char: ch, bubbles: true, cancelable: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: ch, char: ch, bubbles: true, cancelable: true }));
        if (lastChar) {
          element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
        }
      }

      // Fallback for plain <input>/<textarea>: direct value + input event.
      try {
        element.value = (element.value || '') + ch;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (_) { /* element may not be writable */ }

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
