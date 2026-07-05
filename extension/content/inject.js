/**
 * Amplify Auto Poster - Content Script (Lightweight Marker)
 * Chỉ đánh dấu extension đã cài đặt, không decode JWT ở content script
 */

// Đánh dấu extension đã cài
document.documentElement.setAttribute('data-amplify-ext-installed', 'true');
document.documentElement.setAttribute('data-amplify-ext-version', chrome.runtime.getManifest().version);

// Trusted origins for web app communication
const TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://amplify-eight-drab.vercel.app',
];

// Lắng nghe message từ web app để lưu token (chỉ từ trusted origins)
window.addEventListener('message', function(event) {
  // Validate origin trước khi xử lý
  if (!TRUSTED_ORIGINS.includes(event.origin)) return;
  if (event.source !== window) return;

  if (event.data && event.data.type === 'AMPLIFY_SEND_TOKEN' && event.data.token) {
    const apiBase = event.data.api_base || (event.origin + '/api');
    chrome.storage.local.set({
      api_token: event.data.token,
      api_base: apiBase
    }, () => {
      document.documentElement.setAttribute('data-amplify-ext-linked', 'true');
      window.postMessage({ type: 'AMPLIFY_TOKEN_SAVED' }, event.origin);
    });
  }
});

// Lắng nghe kết quả scan từ background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'amplifyScanCompleted') {
    window.postMessage({
      type: 'AMPLIFY_SCAN_COMPLETED',
      results: message.results
    }, window.location.origin);
  }
});
