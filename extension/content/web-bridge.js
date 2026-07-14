/**
 * Amplify Auto Poster - Web Bridge Content Script
 * Runs on the Amplify web app to enable auto-linking:
 *  - Listens for AMPLIFY_SEND_TOKEN postMessage from the page itself
 *  - Stores token in chrome.storage.local so the popup can connect
 *
 * The page side calls (typically in a useEffect on the settings page):
 *   window.postMessage({
 *     type: 'AMPLIFY_SEND_TOKEN',
 *     token: '<jwt>',
 *     api_base: 'https://amplifyhd.tech'
 *   }, '*');
 */

const WEB_BRIDGE_DEBUG = false; // flip true if you need to debug in DevTools console.

const TRUSTED_PAGE_ORIGINS = [
  'https://amplifyhd.tech',
  'https://www.amplifyhd.tech',
  'http://localhost:3000',
  'http://localhost:3001',
];

function log(...args) {
  if (WEB_BRIDGE_DEBUG) console.log('[amplify-web-bridge]', ...args);
}

// Mark extension presence on the page so the SPA can show a "linked" badge
// if it wants to. Cheap and side-effect-free.
document.documentElement.setAttribute('data-amplify-ext-installed', 'true');
document.documentElement.setAttribute(
  'data-amplify-ext-version',
  chrome.runtime.getManifest().version
);

window.addEventListener('message', (event) => {
  if (!TRUSTED_PAGE_ORIGINS.includes(event.origin)) {
    log('Ignored message from untrusted origin:', event.origin);
    return;
  }
  if (event.source !== window) return;

  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'AMPLIFY_SEND_TOKEN' && data.token) {
    const apiBase = data.api_base || event.origin;
    const cleanBase = apiBase.replace(/\/+$/, '');

    chrome.storage.local.set(
      {
        api_token: data.token,
        api_base: cleanBase,
        tokenExpired: false,
      },
      () => {
        document.documentElement.setAttribute('data-amplify-ext-linked', 'true');
        // Acknowledge back to the page so the SPA can render a success toast
        // without re-reading storage.
        window.postMessage({ type: 'AMPLIFY_TOKEN_SAVED' }, event.origin);
        log('Token saved from web bridge');
      }
    );
  }

  if (data.type === 'AMPLIFY_CLEAR_TOKEN') {
    chrome.storage.local.remove(['api_token', 'api_base'], () => {
      document.documentElement.removeAttribute('data-amplify-ext-linked');
      window.postMessage({ type: 'AMPLIFY_TOKEN_CLEARED' }, event.origin);
      log('Token cleared from web bridge');
    });
  }
});