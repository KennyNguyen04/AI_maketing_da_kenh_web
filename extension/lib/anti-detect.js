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
   * Detect whether an element (or any ancestor up to 5 levels) is a Lexical
   * editor. Facebook's home composer uses a hidden wrapper carrying
   * `data-lexical-editor="true"` and a separate inner contenteditable for
   * actual text input. The wrapper is *not* contenteditable itself, so the
   * naive `el.getAttribute('data-lexical-editor')` check on the candidate
   * contenteditable always returns false and the wrong typing path runs.
   *
   * Heuristics, in priority order:
   *   1. element itself has data-lexical-editor="true"
   *   2. closest() ancestor has data-lexical-editor="true"
   *   3. element has the Lexical-internal `__lexicalEditor` property
   *   4. element's parent chain contains the `lexical-root` data attribute
   *      that Facebook's new composer uses (added in 2024+)
   *
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isLexicalElement(element) {
    if (!element) return false;
    try {
      if (element.getAttribute && element.getAttribute('data-lexical-editor') === 'true') {
        return true;
      }
      var p = element;
      for (var depth = 0; depth < 5 && p; depth++) {
        if (p.getAttribute && p.getAttribute('data-lexical-editor') === 'true') {
          return true;
        }
        if (p.__lexicalEditor || (p.dataset && p.dataset.lexicalEditor !== undefined)) {
          return true;
        }
        p = p.parentElement;
      }
      // Sanity check: any element on the page is a Lexical editor? (rare but
      // happens on /compose/post URL where the whole page is the editor host).
      return document.querySelector('[data-lexical-editor="true"]') !== null;
    } catch (_) {
      return false;
    }
  }

  /**
   * Type text into an input/textarea or contenteditable element char-by-char.
   * Uses several strategies so React/Lexical editors (FB, Threads) accept
   * the change as if a human typed it:
   *   1) For Lexical: synthetic keydown/keypress/keyup + InputEvent('insertText')
   *      with proper charCode/keyCode so Lexical's history plugin doesn't
   *      drop the event. Lexical's `insertText` command listens to the
   *      `beforeinput` event with `inputType: 'insertText'`.
   *   2) For other contenteditable: execCommand + InputEvent fallback.
   *   3) For plain <input>/<textarea>: direct value + 'input' event.
   *
   * @param {HTMLInputElement|HTMLTextAreaElement|HTMLElement} element
   * @param {string} text
   * @param {number} [perCharMs=80]
   */
  async function humanType(element, text, perCharMs) {
    var baseMs = (typeof perCharMs === 'number') ? perCharMs : 80;
    if (!element || !text) return;

    try { element.focus(); } catch (_) { /* ignore */ }

    var isContentEditable = element.isContentEditable ||
      (element.getAttribute && element.getAttribute('contenteditable') === 'true');

    // Detect Lexical and route through the dedicated typer that emits
    // keydown/keypress/keyup + beforeinput + input with the right
    // charCode/keyCode. Lexical checks `event.key === ch` in its history
    // recorder, so without a keydown the undo stack records nothing and the
    // text is rejected on the next render cycle.
    if (isContentEditable && isLexicalElement(element)) {
      await humanTypeLexical(element, text, baseMs);
      return;
    }

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var typed = false;

      if (isContentEditable) {
        // Ensure a cursor is in the element
        var sel = window.getSelection();
        if (sel && sel.rangeCount === 0) {
          var range = document.createRange();
          range.selectNodeContents(element);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        // Strategy 1: InputEvent('insertText') — what real keystrokes produce
        try {
          var inputType = (ch === '\n') ? 'insertLineBreak' : 'insertText';
          var beforeInput = new InputEvent('beforeinput', {
            bubbles: true, cancelable: true, inputType: inputType, data: ch
          });
          element.dispatchEvent(beforeInput);
          if (!beforeInput.defaultPrevented) {
            element.dispatchEvent(new InputEvent('input', {
              bubbles: true, cancelable: true, inputType: inputType, data: ch
            }));
            typed = true;
          }
        } catch (_) { /* fall through */ }

        // Strategy 2: execCommand — works on most contenteditable hosts
        if (!typed) {
          try {
            if (document.execCommand('insertText', false, ch)) {
              typed = true;
            }
          } catch (_) { /* fall through */ }
        }

        // Strategy 3: mutate selection + dispatch input so React/Lexical observers fire
        if (!typed) {
          try {
            sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              var r = sel.getRangeAt(0);
              r.deleteContents();
              var tn = document.createTextNode(ch);
              r.insertNode(tn);
              r.setStartAfter(tn);
              r.setEndAfter(tn);
              sel.removeAllRanges();
              sel.addRange(r);
              element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: ch }));
              typed = true;
            }
          } catch (_) { /* fall through */ }
        }
      }

      if (!typed) {
        // Strategy for plain <input>/<textarea>
        try {
          element.value = (element.value || '') + ch;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (_) { /* element may not be writable */ }
      }

      await sleep(baseMs + Math.random() * baseMs * 0.5);
    }
  }

  /**
   * Specialized typing for Lexical editors (Facebook, Instagram web, etc).
   *
   * Why a dedicated path:
   *   Lexical's MutationListener records undo history from keydown events.
   *   If we only fire `beforeinput`/`input`, Lexical still updates the editor
   *   state but the dirty/undo state is wrong and the next render sometimes
   *   drops the text. The robust path is to dispatch a full keystroke:
   *     keydown → keypress → beforeinput → input → keyup
   *   with proper `key`, `code`, `charCode`, `keyCode`, and `which` so the
   *   event matches what the browser would emit for a real key press.
   *
   * For multi-line text we insert a line break via `insertParagraph` after
   * a newline. This produces the same DOM structure as a real Enter key.
   *
   * @param {HTMLElement} element
   * @param {string} text
   * @param {number} baseMs
   */
  async function humanTypeLexical(element, text, baseMs) {
    if (!element || !text) return;
    try { element.focus(); } catch (_) {}

    // Make sure the editor has focus + a selection inside it.
    function ensureSelection() {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        var range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      var anchor = sel.anchorNode;
      if (!element.contains(anchor)) {
        var r2 = document.createRange();
        r2.selectNodeContents(element);
        r2.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r2);
      }
    }
    ensureSelection();

    /**
     * Dispatch a complete synthetic keystroke. Lexical's history plugin
     * listens to `keydown` and `beforeinput`; missing either of them makes
     * the editor drop the event on the next render cycle.
     *
     * @param {string} ch
     */
    function dispatchKey(ch) {
      var key = ch;
      var code = 'Key' + (ch.toUpperCase ? ch.toUpperCase() : ch);
      if (ch === '\n') { key = 'Enter'; code = 'Enter'; }
      var charCode = ch === '\n' ? 0 : ch.charCodeAt(0);
      var keyCode = ch === '\n' ? 13 : charCode;

      var init = {
        key: key,
        code: code,
        charCode: charCode,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        isComposing: false,
        location: 0
      };
      element.dispatchEvent(new KeyboardEvent('keydown', init));
      if (ch !== '\n') {
        element.dispatchEvent(new KeyboardEvent('keypress', init));
      }
      // beforeinput is what Lexical's $insertText node command subscribes to.
      element.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: ch === '\n' ? 'insertLineBreak' : 'insertText',
        data: ch === '\n' ? null : ch
      }));
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: ch === '\n' ? 'insertLineBreak' : 'insertText',
        data: ch === '\n' ? null : ch
      }));
      element.dispatchEvent(new KeyboardEvent('keyup', init));
    }

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      ensureSelection();
      dispatchKey(ch);
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
