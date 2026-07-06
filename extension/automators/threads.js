/**
 * Amplify Auto Poster - Threads Automator v1.0
 * Pattern from MUT Auto Post extension
 */
if (window.amplify_injected_threads) {
  console.log('[Amplify-Threads] Already injected, exiting.');
} else {
window.amplify_injected_threads = true;

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
    console.log('[Amplify-Threads]', msg);
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
      <div style="font-weight:700;color:#ec4899;margin-bottom:10px;border-bottom:1px solid #334155;padding-bottom:5px;">
        🧵 Amplify Auto Poster - Threads
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;">
        ${logs.slice(-8).map(l => `<div>${l}</div>`).join('')}
      </div>
    `;
  }

  function doClick(el) {
    el.focus();
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    el.click();
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

  async function findSmartElement(keywords, retries = 5, allowSubstring = false, container = document) {
    for (let i = 0; i < retries; i++) {
      const targets = container.querySelectorAll('div[role="button"], div[aria-label], span, button');
      for (const el of targets) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const label = (el.getAttribute('aria-label') || "").trim().toLowerCase();
        const text = (el.innerText || "").trim().toLowerCase();
        if (!label && !text) continue;

        const isMatch = keywords.some(kw => {
          const k = kw.toLowerCase();
          return allowSubstring
            ? (label.includes(k) || text.includes(k))
            : (label === k || text === k);
        });

        if (isMatch && el.getAttribute('aria-disabled') !== 'true') return el;
      }
      await sleep(1000);
    }
    return null;
  }

  async function humanTypeText(editor, text) {
    if (!editor || !text) return;
    editor.focus();
    await sleep(200);
    await AD.humanType(editor, text, 60);
  }

  // ══ MAIN FLOW ══
  try {
    addLog('Khởi động Auto Poster - Threads...');
    await sleep(2000);

    const stored = await chrome.storage.local.get('currentProcessingPost');
    const post = stored.currentProcessingPost;
    if (!post) {
      addLog('❌ Không tìm thấy dữ liệu bài đăng.');
      return;
    }

    // 1. Chuẩn bị ảnh (optional — Threads cho đăng text-only)
    let images = [];
    try {
      const raw = post.images || [];
      images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

    if (images.length === 0) {
      addLog('⚠️ Không có ảnh — sẽ đăng text-only.');
    } else {
      addLog(`Chuẩn bị nạp ${images.length} ảnh...`);
      const dt = makeDataTransfer();
      for (let i = 0; i < images.length; i++) {
        try {
          const res = await fetchImageViaBackground(images[i]);
          if (res && res.dataUrl) {
            const file = dataURLtoFile(res.dataUrl, `img_${i}.png`);
            dt.items.add(file);
            addLog(`✅ Nạp thành công ảnh [${i+1}]`);
          } else {
            addLog(`❌ Lỗi tải ảnh [${i+1}]`);
          }
        } catch (e) { addLog(`❌ Bị chặn tải ảnh [${i+1}]`); }
      }

      if (dt.files.length === 0) {
        addLog('⚠️ Không tải được ảnh nào — chuyển sang text-only.');
      }
    }

    // 2. Mở modal đăng bài
    addLog(`Tìm vị trí tạo bài viết...`);
    const fakeInputs = document.querySelectorAll('div[role="button"], a[role="link"], span');
    for (const el of fakeInputs) {
      const txt = (el.innerText || "").trim().toLowerCase();
      if (
        txt.includes('có gì mới') ||
        txt.includes('what\'s new') ||
        txt.includes('start a thread') ||
        txt.includes('bắt đầu thread')
      ) {
        doClick(el);
        addLog(`✅ Đã bấm mở bảng Threads!`);
        await sleep(2000);
        break;
      }
    }

    let activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
    let fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');

    if (!fileInput) {
      addLog(`Thử bấm icon Tạo bài...`);
      const menuBtns = document.querySelectorAll('[aria-label*="New thread"], [aria-label*="Tạo thread"], [aria-label*="Create"], [aria-label*="Tạo"]');
      if (menuBtns.length > 0) {
        doClick(menuBtns[0]);
        await sleep(1500);
      }
      activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
      fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
    }

    // 3. Tìm và đẩy ảnh (skip khi không có file)
    addLog(`Tìm khay chứa ảnh ẩn...`);
    if (dt.files.length > 0) {
      if (!fileInput) {
        const photoBtn = await findSmartElement(["Ảnh/video", "Photo/video", "Add Media", "Thêm file"], 3, true, activeModal);
        if (photoBtn) {
          doClick(photoBtn);
          await sleep(1500);
        }
        activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
        fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
      }

      if (!fileInput) {
        throw new Error("Không thể tìm thấy vị trí chèn ảnh trên Threads.");
      }

      addLog(`Đẩy ${dt.files.length} ảnh vào...`);
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files').set;
      if (nativeSetter) { nativeSetter.call(fileInput, dt.files); }
      else { fileInput.files = dt.files; }
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      addLog(`⏳ Đợi Modal render (5s)...`);
      await sleep(5000);
    } else {
      addLog(`Bỏ qua bước đính ảnh — chỉ đăng text.`);
    }

    // 4. Điền text
    addLog(`Tìm ô soạn chữ...`);
    let editor = null;
    for (let i = 0; i < 8; i++) {
      const editorModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
      editor = editorModal.querySelector('[data-lexical-editor="true"], div[role="textbox"]');
      if (editor) break;
      await sleep(500);
    }

    if (!editor) throw new Error("Bảng đăng bài không tự bật.");

    addLog(`Nạp nội dung (mô phỏng gõ tay)...`);
    editor.focus();
    await sleep(500);
    const content = post.content || post.post_content || '';
    await humanTypeText(editor, content);
    addLog(`✅ Đã nạp xong nội dung.`);

    await sleep(2000);

    // 5. Bấm Đăng
    addLog(`Tìm nút Đăng...`);
    const finalKeywords = ["Đăng", "Post", "Chia sẻ"];

    let steps = 0;
    let clickedPost = false;

    while (steps < 4 && !clickedPost) {
      addLog(`[Dò bước ${steps + 1}] Tìm nút Đăng...`);
      const activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;

      // Strict match
      let btn = await findSmartElement(finalKeywords, 2, false, activeModal);
      if (btn) {
        addLog(`✅ Tìm thấy nút ĐĂNG!`);
        btn.click();
        clickedPost = true;
        break;
      }

      // Loose match
      btn = await findSmartElement(finalKeywords, 2, true, activeModal);
      if (btn) {
        addLog(`✅ Tìm thấy nút Đăng (loose).`);
        doClick(btn);
        clickedPost = true;
        break;
      }

      addLog(`⚠️ Không tìm thấy nút Đăng!`);
      break;
    }

    if (!clickedPost) throw new Error("Không thể hoàn thành chu trình bấm nút Đăng.");

    // Extract actor info
    let actorUrl = null;
    let actorName = null;
    try {
      const profileLink = Array.from(document.querySelectorAll('a')).find(a =>
        a.getAttribute('href') && a.getAttribute('href').startsWith('/@')
      );
      if (profileLink) {
        actorUrl = "https://www.threads.net" + profileLink.getAttribute('href');
        actorName = profileLink.getAttribute('href').replace('/@', '');
      }
    } catch (e) {}

    addLog(`✅ Bấm Đăng thành công!`);
    // Auto-like disabled: violates platform ToS (see lib/anti-detect.js)

    addLog(`⏳ Giữ tab thêm (3-10s)...`);
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
    console.error('[Amplify-Threads] Error:', error);
    addLog(`❌ Lỗi: ${error.message}`);
    const stored = await chrome.storage.local.get('currentProcessingPost');
    const postId = stored.currentProcessingPost?.id;
    await chrome.storage.local.remove('currentProcessingPost');
    chrome.runtime.sendMessage({ action: 'postFailed', postId, error: error.message });
  }
})();
}
