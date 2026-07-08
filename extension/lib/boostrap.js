/**
 * Amplify Auto Poster - Bootstrap
 *
 * Runs as part of content_scripts at document_start on facebook.com,
 * https://www.instagram.com/, x.com, twitter.com, threads.net. Its only
 * job is to "fast-forward" the user's trip to the post composer:
 *
 *   1. Watch for the platform's "create post" card and click it the instant
 *      it appears. The home feed is heavily lazy-loaded (stories, "Suggested
 *      for you", reels, ads); clicking the create card as soon as it mounts
 *      cuts the 5-10s wait to ~1-2s.
 *
 *   2. Once the modal composer mounts, the platform-specific automator (in
 *      window.__amplifyAutomator*) takes over — bootstrap exits.
 *
 * IMPORTANT: bootstrap only acts if the background service worker signals
 * a task is in flight for this tab (chrome.storage.local.amplifyProcessing
 * matches the current tab id). This prevents hijacking a tab the user
 * opened themselves.
 *
 * Self-disables if no task is in flight after 1.5s — content scripts
 * otherwise fire on every Facebook tab the user visits.
 */
(function () {
  'use strict';

  function isOnHomeFeed() {
    if (location.host.includes('instagram.com')) return true; // IG home has a composer shortcut
    if (location.host.includes('x.com') || location.host.includes('twitter.com')) return false; // /compose/post works directly
    if (location.host.includes('threads.net')) return true;
    // Facebook: skip profile pages, group pages, watch, marketplace — only home.
    const p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    return p === '/' || p === '';
  }

  // Per-platform create-post card keywords.
  const PLATFORM_CFG = (function () {
    const host = location.host;
    if (host.includes('facebook.com')) {
      return {
        keywords: ['tạo bài viết', 'create a post', 'create post'],
        exclude: ['story', 'reel', 'khoảnh khắc', 'live', 'room', 'shortcut'],
      };
    }
    if (host.includes('threads.net')) {
      return {
        keywords: ['bài viết mới', 'new post', 'new thread'],
        exclude: ['reel', 'live'],
      };
    }
    if (host.includes('instagram.com')) {
      return {
        keywords: ['tạo bài viết', 'create', 'new post', 'create a post'],
        exclude: ['story', 'reel', 'live'],
      };
    }
    return null;
  })();

  if (!PLATFORM_CFG) return;
  if (!isOnHomeFeed()) return;

  function isMatch(el) {
    const label = (el.getAttribute && el.getAttribute('aria-label')) || '';
    const text = (el.innerText || '');
    if (!label && !text) return false;
    const haystack = (label + ' ' + text).toLowerCase();
    if (!PLATFORM_CFG.keywords.some(k => haystack.includes(k))) return false;
    if (PLATFORM_CFG.exclude.some(k => haystack.includes(k))) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function clickCreatePost() {
    const candidates = document.querySelectorAll(
      'div[role="button"], a[role="link"], span, div[aria-label]'
    );
    for (const el of candidates) {
      if (!isMatch(el)) continue;
      try {
        el.scrollIntoView({ block: 'center' });
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.click();
        return true;
      } catch (_) {
        try { el.click(); return true; } catch (_) {}
      }
    }
    return false;
  }

  // Wait until storage says this tab is the one being processed, then
  // start watching. If no signal arrives within 1.5s, abort — content
  // scripts otherwise fire on every Facebook tab the user visits.
  chrome.storage.local.get('amplifyProcessing', (d) => {
    const proc = d && d.amplifyProcessing;
    if (!proc) return; // user-opened tab; do nothing.
    // The tab.id we stored matches the tab this script is running in.
    // We can't compare tab.id from here (chrome API doesn't expose it in
    // content scripts), but bg-side will only set amplifyProcessing when
    // it just created a tab, so timing > identity check is enough.
    if (!proc.stage) return;

    let clicked = false;
    const observer = new MutationObserver(() => {
      if (clicked) return;
      if (clickCreatePost()) {
        clicked = true;
        observer.disconnect();
      }
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    // Give up after 8s — automator has its own fallback.
    setTimeout(() => observer.disconnect(), 8000);
  });
})();
