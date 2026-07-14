/**
 * Amplify Auto Poster - Web Bridge Content Script
 * Runs on the Amplify web app to enable auto-linking and trigger force scans:
 *  - Listens for AMPLIFY_SEND_TOKEN postMessage from the page itself
 *  - Stores token in chrome.storage.local so the popup can connect
 *  - Listens for AMPLIFY_FORCE_SCAN to wake up extension SW ngay lập tức
 *    (không cần đợi alarm 30s) — 14jul latency fix
 *  - Forwards AMPLIFY_REGISTER_FAILED từ register() retry về web app để hiển thị toast
 *
 * The page side calls (typically in a useEffect on the settings page):
 *   window.postMessage({
 *     type: 'AMPLIFY_SEND_TOKEN',
 *     token: '<jwt>',
 *     api_base: 'https://amplifyhd.tech'
 *   }, '*');
 *
 *   window.postMessage({ type: 'AMPLIFY_FORCE_SCAN' }, '*');
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

/**
 * Register with backend so /api/extension/health reports connected=true.
 * Retry 1 lần sau 2s nếu fail. Nếu vẫn fail → báo lỗi về web app qua
 * postMessage AMPLIFY_REGISTER_FAILED để hiển thị toast (14jul 2026 fix).
 *
 * @param {string} cleanBase - API base URL without trailing slash
 * @param {string} token - Bearer token
 * @param {string} origin - trusted page origin to echo back
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function registerWithBackend(cleanBase, token, origin) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const regRes = await fetch(`${cleanBase}/api/extension/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (regRes.ok) return { ok: true };
      log(`Auto-register attempt ${attempt}: http ${regRes.status}`);
      if (attempt === 2) return { ok: false, error: `HTTP ${regRes.status}` };
    } catch (e) {
      log(`Auto-register attempt ${attempt} failed:`, e && e.message);
      if (attempt === 2) return { ok: false, error: (e && e.message) || 'Network error' };
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
  }
  return { ok: false, error: 'unknown' };
}

// React to two kinds of registration events:
//   1. self-initiated — the SPA posts AMPLIFY_SEND_TOKEN, we save it and
//      re-broadcast AMPLIFY_TOKEN_SAVED (handled below in the listener).
//   2. popup-initiated — the user paste-saved in the popup directly. The
//      popup calls /register and then sends us a chrome.runtime message
//      with type=AMPLIFY_TOKEN_SAVED so the SPA can refresh its badge
//      without waiting for the 30s poll.
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'AMPLIFY_TOKEN_SAVED') return;
  window.postMessage({ type: 'AMPLIFY_TOKEN_SAVED' }, window.location.origin);
});

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
      async () => {
        document.documentElement.setAttribute('data-amplify-ext-linked', 'true');
        // Acknowledge back to the page so the SPA can render a success toast
        // without re-reading storage.
        window.postMessage({ type: 'AMPLIFY_TOKEN_SAVED' }, event.origin);
        log('Token saved from web bridge');

        // Register with backend + notify page if registration fails (14jul fix).
        const regResult = await registerWithBackend(cleanBase, data.token, event.origin);
        if (!regResult.ok) {
          window.postMessage(
            { type: 'AMPLIFY_REGISTER_FAILED', error: regResult.error || 'unknown' },
            event.origin
          );
        }
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

  // 14jul 2026: wake up extension SW ngay khi user click "Đăng ngay".
  // Trước đó extension poll mỗi 30s → tab FB mở sau 0-30s (worst case 60-90s).
  // Giờ force scan ngay → tab mở trong 1-3 giây.
  if (data.type === 'AMPLIFY_FORCE_SCAN') {
    chrome.runtime.sendMessage({ action: 'forceScan' }, () => {
      if (chrome.runtime.lastError) { /* popup/background not listening — non-fatal */ }
    });
    return;
  }
});