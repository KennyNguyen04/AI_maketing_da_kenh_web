/**
 * Amplify Auto Poster - Instagram Automator v1.0
 * Pattern from MUT Auto Post extension
 */
if (window.amplify_injected_ig) {
  console.log('[Amplify-IG] Already injected, exiting.');
} else {
window.amplify_injected_ig = true;

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
    console.log('[Amplify-IG]', msg);
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
        📸 Amplify Auto Poster - Instagram
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

  async function findByText(texts, retries = 5) {
    for (let i = 0; i < retries; i++) {
      const els = document.querySelectorAll('span, div, button, a');
      for (const el of els) {
        const text = (el.innerText || '').trim();
        if (!text) continue;
        if (texts.some(t => text === t || text.toLowerCase() === t.toLowerCase())) {
          return el;
        }
      }
      await sleep(1000);
    }
    return null;
  }

  // ══ MAIN ══
  let postId = null;
  try {
    addLog('Khởi động Auto Poster - Instagram...');
    await sleep(3000);

    const stored = await chrome.storage.local.get('currentProcessingPost');
    const post = stored.currentProcessingPost;
    if (!post) {
      addLog('❌ Không tìm thấy bài đăng.');
      return;
    }
    postId = post.id;

    // 1. Chuẩn bị file
    let images = [];
    try {
      const raw = post.images || [];
      images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

    if (images.length === 0) {
      addLog('⚠️ Bài không có ảnh — sẽ đăng text-only (IG cho phép).');
    }

    // IG cho phép tối đa 10 file
    if (images.length > 10) {
      addLog(`IG giới hạn 10 ảnh, lược bỏ ${images.length - 10} ảnh`);
      images = images.slice(0, 10);
    }

    addLog(`Tải ${images.length} ảnh...`);
    const files = [];
    for (let i = 0; i < images.length; i++) {
      const res = await fetchImageViaBackground(images[i]);
      if (res && res.dataUrl) {
        files.push(dataURLtoFile(res.dataUrl, `ig_${i}.png`));
        addLog(`✅ Nạp ảnh [${i + 1}]`);
      } else {
        addLog(`❌ Lỗi tải ảnh [${i + 1}]`);
      }
    }
    if (files.length === 0 && images.length > 0) {
      addLog('⚠️ Không tải được ảnh nào — chuyển sang text-only.');
    }

    // 2. Mở nút Create (+)
    addLog('Tìm nút Create (+)...');
    const createLabels = ['New post', 'Tạo mới', 'Tạo', 'Create', 'Bài viết mới'];
    let createBtn = null;
    for (const label of createLabels) {
      const el = document.querySelector(`svg[aria-label="${label}"]`)?.closest('a, div[role="button"]') ||
                 document.querySelector(`a[aria-label="${label}"], div[role="button"][aria-label="${label}"]`);
      if (el) { createBtn = el; break; }
    }
    if (!createBtn) {
      createBtn = Array.from(document.querySelectorAll('a, div[role="button"]'))
        .find(a => /create|tạo mới|tạo/i.test(a.getAttribute('aria-label') || a.innerText || ''));
    }
    if (!createBtn) throw new Error('Không tìm thấy nút Create (+)');
    doClick(createBtn);
    addLog('✅ Đã bấm Create');
    await sleep(2000);

    // Sub-menu "Post"
    const postSub = await findByText(['Post', 'Bài viết'], 3);
    if (postSub) {
      doClick(postSub);
      addLog('✅ Đã chọn loại: Post');
      await sleep(3000);
    }

    // 3. Nạp file
    addLog('Tìm input file...');
    let fileInput = null;
    for (let i = 0; i < 20; i++) {
      fileInput = document.querySelector('input[type="file"][accept*="image"]') ||
                  document.querySelector('input[type="file"][accept*="video"]') ||
                  document.querySelector('input[type="file"]');
      if (fileInput) break;
      await sleep(1000);
    }
    if (!fileInput) throw new Error('Không tìm thấy input file');

    const dt = makeDataTransfer();
    files.forEach(f => dt.items.add(f));
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files').set;
    if (nativeSetter) nativeSetter.call(fileInput, dt.files);
    else fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    addLog(`📦 Đã nạp ${files.length} ảnh, đợi IG render (4s)...`);
    await sleep(4000);

    // 4. Chọn tỷ lệ Nguyên bản (Original)
    const cropLabels = ['Select crop', 'Chọn tỷ lệ cắt', 'Crop', 'Tỷ lệ', 'Adjust crop', 'Chọn kích thước cắt'];
    let cropBtn = null;
    for (const label of cropLabels) {
      cropBtn = document.querySelector(`svg[aria-label="${label}"]`)?.closest('button') ||
                document.querySelector(`button[aria-label="${label}"]`);
      if (cropBtn) break;
    }
    if (!cropBtn) {
      const toolbarBtns = document.querySelectorAll('div[role="dialog"] button, div[class*="Carousel"] button');
      cropBtn = Array.from(toolbarBtns).find(b => {
        const svg = b.querySelector('svg');
        return svg && (b.getAttribute('aria-label') || '').match(/crop|tỷ lệ/i);
      });
    }

    if (cropBtn) {
      doClick(cropBtn);
      addLog('📐 Mở chọn tỷ lệ...');
      await sleep(2000);

      let originalBtn = await findByText(['Original', 'Nguyên bản', 'Gốc'], 3);
      if (!originalBtn) {
        originalBtn = document.querySelector('button[aria-label="Original"], button[aria-label="Nguyên bản"]') ||
                      Array.from(document.querySelectorAll('button, div[role="button"]'))
                        .find(b => /original|nguyên bản|gốc/i.test(b.getAttribute('aria-label') || b.title || ''));
      }
      if (originalBtn) {
        doClick(originalBtn);
        addLog('✅ Đã chọn tỷ lệ Nguyên bản');
        await sleep(1500);
      } else {
        addLog('⚠️ Không tìm thấy nút Original');
      }
    } else {
      addLog('⚠️ Không tìm thấy nút crop');
    }

    await sleep(3000);

    // 5. Next → Next → Share
    let clicks = 0;
    let posted = false;
    while (clicks < 5 && !posted) {
      const allBtns = Array.from(document.querySelectorAll('div[role="button"], button'));
      const nextBtn = allBtns.find(b => ['Next', 'Tiếp', 'Share', 'Chia sẻ'].includes((b.innerText || '').trim()));

      if (!nextBtn) {
        await sleep(2000);
        clicks++;
        continue;
      }

      const btnText = nextBtn.innerText.trim().toLowerCase();

      // Trước Share thì điền caption
      if (btnText === 'share' || btnText === 'chia sẻ') {
        const captionBox =
          document.querySelector('div[aria-label*="caption" i]') ||
          document.querySelector('div[aria-label*="chú thích" i]') ||
          document.querySelector('div[contenteditable="true"]');
        if (captionBox) {
          addLog('✍️ Nạp caption...');
          captionBox.click();
          await sleep(800);
          captionBox.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, post.content || post.post_content || '');
          captionBox.dispatchEvent(new Event('input', { bubbles: true }));
          captionBox.dispatchEvent(new Event('change', { bubbles: true }));
          addLog('✅ Caption OK, đợi 4s rồi Share...');
          await sleep(4000);
        }
      }

      addLog(`Bấm "${nextBtn.innerText.trim()}"`);
      doClick(nextBtn);

      if (btnText === 'share' || btnText === 'chia sẻ') {
        posted = true;
        break;
      }
      await sleep(3500);
      clicks++;
    }

    if (!posted) throw new Error('Không hoàn tất chuỗi Next → Share');

    // 6. Lấy actor info
    let actorUrl = null;
    let actorName = null;
    try {
      const profileLink = Array.from(document.querySelectorAll('a[href^="/"]'))
        .find(a => {
          const h = a.getAttribute('href') || '';
          return /^\/[a-zA-Z0-9._]+\/?$/.test(h) && !h.includes('explore') && !h.includes('reels') && !h.includes('direct');
        });
      if (profileLink) {
        actorUrl = 'https://www.instagram.com' + profileLink.getAttribute('href');
        actorName = profileLink.getAttribute('href').replace(/^\/|\/$/g, '');
      }
    } catch (e) {}

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
    console.error('[Amplify-IG] Error:', error);
    addLog(`❌ Lỗi: ${error.message}`);
    // Cleanup ngay currentProcessingPost trong storage để popup không
    // hiển thị stale "Đang đăng lên Instagram" sau khi task đã fail.
    // Background vẫn xóa lần nữa trong postFailed handler (line 480).
    try { await chrome.storage.local.remove('currentProcessingPost'); } catch (_) {}
    if (postId) chrome.runtime.sendMessage({ action: 'postFailed', postId, error: error.message });
  }
})();
}
