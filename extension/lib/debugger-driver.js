/**
 * Amplify Auto Poster - Debugger Driver (content-side)
 *
 * The chrome.debugger API only exists in the service worker, not in content
 * scripts. This shim forwards "send a key event" requests to the SW, which
 * calls chrome.debugger.sendCommand under the hood.
 *
 * Why this exists: Facebook's "press P to open composer" shortcut hooks
 * rawKeyDown events at the browser level. Synthesizing KeyboardEvents from
 * inside the page doesn't reach FB's handler. CDP is the only way.
 */
(function (global) {
  'use strict';

  function rpc(action, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ scope: 'debugger', action, ...payload }, (resp) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'no receiver'));
          return;
        }
        if (!resp || !resp.ok) {
          reject(new Error((resp && resp.error) || 'debugger RPC failed'));
          return;
        }
        resolve(resp.result);
      });
    });
  }

  /**
   * Runs cb inside a chrome.debugger attach/detach envelope. The SW does
   * the actual attach before the first RPC and detaches when cb returns
   * (or rejects). Returns whatever cb returns.
   *
   * If the user denied the "debug this browser" prompt on a previous run,
   * rpc('attach') will throw "Another debugger is already attached" or
   * "Cannot find context". Caller should catch and fall back to DOM-based
   * automation.
   */
  async function withDebugger(cb) {
    try {
      await rpc('attach');
    } catch (e) {
      throw new Error('Debugger attach failed: ' + e.message);
    }
    try {
      return await cb();
    } finally {
      try { await rpc('detach'); } catch (_) { /* swallow */ }
    }
  }

  async function pressShortcut(ch) {
    const desc = describeChar(ch);
    if (!desc) throw new Error('Unknown key: ' + ch);
    return rpc('pressKey', { desc });
  }

  /**
   * Detach the debugger explicitly. Called by automators before clicking
   * the final "Đăng" / "Post" button: CDP attach shows a yellow banner
   * ("Amplify Auto Poster started debugging this browser") that sits on
   * top of the page with z-index 2147483647 and intercepts pointer
   * events. The banner disappears only when the debugger detaches, so we
   * must detach BEFORE the user-facing click. The subsequent click is
   * plain DOM — we don't need CDP for it because the dialog button is a
   * trusted React onClick handler that responds to a real MouseEvent.
   */
  async function detach() {
    try {
      await rpc('detach');
    } catch (_) { /* swallow — best-effort */ }
  }

  async function insertText(text) {
    await rpc('insertText', { text });
  }

  async function typeText(text, opts) {
    const o = opts || {};
    const perCharDelayMs = typeof o.delayMs === 'number' ? o.delayMs : 12;

    for (const ch of text) {
      const desc = describeChar(ch);
      if (!desc) {
        await rpc('insertText', { text: ch });
      } else {
        await rpc('pressKey', { desc });
      }
      if (perCharDelayMs > 0) {
        await new Promise(r => setTimeout(r, perCharDelayMs));
      }
    }
  }

  /**
   * Send a real mouse click at viewport coords via CDP. Used as a fallback
   * for "Tạo bài viết" — synthesized .click() events get blocked by FB's
   * React tree, but a real mouse event from the browser reaches the
   * React fiber's onClick handler.
   *
   * @param {number} x
   * @param {number} y
   * @param {{ button?: 'left'|'middle'|'right', clickCount?: number }} [opts]
   */
  async function mouseClick(x, y, opts) {
    const o = opts || {};
    await rpc('mouseClick', {
      x, y,
      button: o.button || 'left',
      clickCount: typeof o.clickCount === 'number' ? o.clickCount : 1,
    });
  }

  // --- helpers (mirror of background-side descriptors) ---
  function describeChar(ch) {
    if (ch === '\n') return { key: 'Enter', code: 'Enter', vk: 13, text: '\r' };
    if (ch === '\t') return { key: 'Tab', code: 'Tab', vk: 9, text: '\t' };
    const code = ch.charCodeAt(0);
    if (code < 32) return null;
    if (ch >= 'a' && ch <= 'z') return { key: ch, code: 'Key' + ch.toUpperCase(), vk: code };
    if (ch >= 'A' && ch <= 'Z') return { key: ch, code: 'Key' + ch, vk: code, shift: true, text: ch };
    if (ch >= '0' && ch <= '9') return { key: ch, code: 'Digit' + ch, vk: code };
    const punct = {
      ' ': { vk: 32, code: 'Space', text: ' ' },
      ',': { vk: 188, code: 'Comma', text: ',' },
      '.': { vk: 190, code: 'Period', text: '.' },
      '/': { vk: 191, code: 'Slash', text: '/' },
      ';': { vk: 186, code: 'Semicolon', text: ';' },
      "'": { vk: 222, code: 'Quote', text: "'" },
      '[': { vk: 219, code: 'BracketLeft', text: '[' },
      ']': { vk: 221, code: 'BracketRight', text: ']' },
      '\\': { vk: 220, code: 'Backslash', text: '\\' },
      '-': { vk: 189, code: 'Minus', text: '-' },
      '=': { vk: 187, code: 'Equal', text: '=' },
      '`': { vk: 192, code: 'Backquote', text: '`' },
    };
    return punct[ch] || null;
  }

  global.AmplifyDebugger = { withDebugger, pressShortcut, typeText, mouseClick, insertText, detach };
})(typeof window !== 'undefined' ? window : globalThis);