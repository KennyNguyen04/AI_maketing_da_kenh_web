/**
 * Amplify Auto Poster - X (Twitter) Automator v1.0
 * Pattern from MUT Auto Post extension
 */
if (window.amplify_injected_x) {
  console.log('[Amplify-X] Already injected, exiting.');
} else {
window.amplify_injected_x = true;

(async function() {
  // Anti-detect utilities (lib/anti-detect.js) loaded first by background.js
  const AD = window.__amplifyAntiDetect || {};
  const sleep = AD.sleep || ((ms) => new Promise(r => setTimeout(r, ms)));
  const humanDelay = AD.humanDelay || (() => sleep(3000 + Math.floor(Math.random() * 7000)));
  const autoLikeFeed = AD.autoLikeFeed || (async () => {});
  const logs = [];

  function addLog(msg) {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logs.push(`[${timeStr}] ${msg}`);
    console.log('[Amplify-X]', msg);
    chrome.storage.local.set({ lastStatus: msg });

    let el = document.getElementById('amplify-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'amplify-status';
      el.style.cssText = `
        position:fixed;top:10px;right:10px;z-index:2147483647;
        padding:16px;border-radius:12px;color:#fff;
        background:rgba(15,23,42,0.95);font-size:13px;
        font-family:-apple-system,BlinkMacSystemFont,monospace;
        box-shadow:0 10px 25px rgba(0,0,0,0.6);
        width:320px;line-height:1.6;pointer-events:none;
        border:1px solid #334155;
      `;
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div style="font-weight:700;color:#e2e8f0;margin-bottom:10px;border-bottom:1px solid #334155;padding-bottom:5px;">
        𝕏 Amplify Auto Poster - X (Twitter)
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;">
        ${logs.slice(-8).map(l => `<div>${l}</div>`).join('')}
      </div>
    `;
  }

  function fetchImageViaBackground(url) {
    return new Promise(resolve => {
      const isUploadId = typeof url === 'string' && url.startsWith('upl_');
      const action = isUploadId ? 'fetchMediaByUploadId' : 'fetchImage';
      const payload = isUploadId ? { uploadId: url } : { url };
      chrome.runtime.sendMessage({ action, ...payload }, res => {
        if (res && res.success) resolve(res);
        else resolve(null);
      });
    });
  }

  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  function makeDataTransfer() {
    return new DataTransfer();
  }

  function waitForElement(sel, timeout = 15000) {
    return new Promise(resolve => {
      const start = Date.now();
      const iv = setInterval(() => {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect && el.getBoundingClientRect().width > 0) {
          clearInterval(iv);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(iv);
          resolve(null);
        }
      }, 500);
    });
  }

  function triggerReactClick(el) {
    let node = el;
    for (let i = 0; i < 5; i++) {
      if (!node) break;
      const key = Object.keys(node).find(k => k.startsWith('__reactProps'));
      if (key) {
        const props = node[key];
        if (typeof props.onClick === 'function') {
          addLog(`React onClick found at level ${i}`);
          props.onClick({
            type: 'click',
            preventDefault: () => {},
            stopPropagation: () => {},
            target: el,
            currentTarget: node,
            nativeEvent: {}
          });
          return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function doClick(el) {
    if (triggerReactClick(el)) return;
    el.focus();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    el.click();
  }

  // ══ MAIN ══
  let postId = null;
  try {
    addLog('Khởi động Auto Poster - X...');
    await sleep(2500);

    const stored = await chrome.storage.local.get('currentProcessingPost');
    const post = stored.currentProcessingPost;
    if (!post) {
      addLog('❌ Không tìm thấy bài đăng.');
      return;
    }
    postId = post.id;

    // 1. Chuẩn bị file - X giới hạn 4 ảnh
    let images = [];
    try {
      const raw = post.images || [];
      images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

    if (images.length > 4) {
      addLog(`X giới hạn 4 ảnh, lược bỏ ${images.length - 4} ảnh`);
      images = images.slice(0, 4);
    }

    addLog(`Tải ${images.length} ảnh...`);
    const files = [];
    for (let i = 0; i < images.length; i++) {
      const res = await fetchImageViaBackground(images[i]);
      if (res && res.dataUrl) {
        files.push(dataURLtoFile(res.dataUrl, `x_${i}.png`));
        addLog(`✅ Nạp ảnh [${i + 1}]`);
      } else {
        addLog(`❌ Lỗi tải ảnh [${i + 1}]`);
      }
    }
    if (files.length === 0) addLog('⚠️ Không có ảnh, đăng text-only');

    // 2. Điền text
    addLog('Tìm ô soạn tweet...');
    const composer = await waitForElement('div[data-testid="tweetTextarea_0"]', 12000);
    if (!composer) throw new Error('Không tìm thấy composer');

    composer.focus();
    await sleep(500);
    document.execCommand('selectAll', false, null);

    // Hỗ trợ cả 'content' và 'post_content' (tương thích MUT)
    const textDt = makeDataTransfer();
    textDt.setData('text/plain', post.content || post.post_content || '');
    composer.dispatchEvent(new ClipboardEvent('paste', { clipboardData: textDt, bubbles: true, cancelable: true }));
    try { document.execCommand('insertText', false, post.content || post.post_content || ''); } catch (e) {}
    addLog('✅ Đã nạp text');
    await sleep(1500);

    // 3. Nạp file
    if (files.length > 0) {
      const fileInput = document.querySelector('input[data-testid="fileInput"]') ||
                        document.querySelector('input[type="file"][accept*="image"]');
      if (!fileInput) throw new Error('Không tìm thấy input file');

      const dt = makeDataTransfer();
      files.forEach(f => dt.items.add(f));
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files').set;
      if (nativeSetter) nativeSetter.call(fileInput, dt.files);
      else fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      addLog(`📦 Đã nạp ${files.length} ảnh, đợi X xử lý...`);

      const waitMs = Math.max(5000, files.length * 6000);
      await sleep(waitMs);
    }

    // 4. Bấm nút Post
    addLog('Tìm nút Post...');
    let postBtn = document.querySelector('[data-testid="tweetButtonInline"]') ||
                  document.querySelector('[data-testid="tweetButton"]');

    const isDisabled = (btn) => !btn || btn.getAttribute('aria-disabled') === 'true' || btn.disabled === true || btn.hasAttribute('disabled');
    let attempts = 0;
    while (attempts < 6 && isDisabled(postBtn)) {
      addLog('⏳ Nút Post chưa sẵn sàng, đợi 4s...');
      await sleep(4000);
      postBtn = document.querySelector('[data-testid="tweetButtonInline"]') ||
                document.querySelector('[data-testid="tweetButton"]');
      attempts++;
    }
    if (!postBtn) throw new Error('Không tìm thấy nút Post');

    // Thử React onClick
    addLog('Thử React onClick...');
    const reactOk = triggerReactClick(postBtn);
    addLog(reactOk ? '✅ React onClick gọi xong' : '⚠️ Không tìm thấy React onClick');
    await sleep(1500);

    // Kiểm tra đã submit chưa
    let stillOpen = document.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]');

    // Thử Ctrl+Enter
    if (stillOpen) {
      addLog('Thử Ctrl+Enter...');
      const editable = composer.querySelector('[contenteditable="true"]') || composer;
      editable.focus();
      await sleep(300);
      for (const type of ['keydown', 'keypress', 'keyup']) {
        editable.dispatchEvent(new KeyboardEvent(type, {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
          ctrlKey: true, metaKey: true, bubbles: true, cancelable: true
        }));
      }
      await sleep(1500);
      stillOpen = document.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]');
    }

    // Thử PointerEvent trực tiếp
    if (stillOpen) {
      addLog('Thử PointerEvent...');
      doClick(postBtn);
      await sleep(1500);
    }

    addLog('🚀 Đã gửi lệnh post...');
    await sleep(8000);

    // 5. Lấy actor info
    let actorUrl = null;
    let actorName = null;
    try {
      const sideAccount = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') ||
                          document.querySelector('a[aria-label*="Profile"]');
      if (sideAccount) {
        const href = sideAccount.getAttribute('href') || '';
        actorUrl = 'https://x.com' + href;
        actorName = href.replace(/^\/|\/$/g, '');
      }
    } catch (e) {}

    addLog(`⏳ Giữ tab thêm (3-10s) để chống quét...`);
    await humanDelay();

    addLog(`🏁 HOÀN TẤT!`);
    await chrome.storage.local.remove('currentProcessingPost');
    chrome.runtime.sendMessage({
      action: 'postCompleted',
      postId: post.id,
      resultUrl: actorUrl || window.location.href,
      actorUrl,
      actorName
    });

  } catch (error) {
    console.error('[Amplify-X] Error:', error);
    addLog(`❌ Lỗi: ${error.message}`);
    // Cleanup ngay currentProcessingPost trong storage để popup không
    // hiển thị stale "Đang đăng lên X" sau khi task đã fail. Background
    // vẫn xóa lần nữa trong postFailed handler (line 480), nhưng đây
    // là belt-and-suspenders cho UX consistency.
    try { await chrome.storage.local.remove('currentProcessingPost'); } catch (_) {}
    if (postId) chrome.runtime.sendMessage({ action: 'postFailed', postId, error: error.message });
  }
})();
}
