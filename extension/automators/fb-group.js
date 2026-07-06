/**
 * Amplify Auto Poster - Facebook Group Automator v1.0
 * Pattern from MUT Auto Post extension
 */
if (window.amplify_injected_fb_group) {
  console.log('[Amplify-FB-Group] Already injected, exiting.');
} else {
window.amplify_injected_fb_group = true;

(async function() {
  // Anti-detect utilities (lib/anti-detect.js) loaded first by background.js
  const AD = window.__amplifyAntiDetect || {};
  const sleep = AD.sleep || ((ms) => new Promise(r => setTimeout(r, ms)));
  const humanDelay = AD.humanDelay || (() => sleep(3000 + Math.floor(Math.random() * 7000)));
  const autoLikeFeed = AD.autoLikeFeed || (async () => {});
  const logs = [];

  // ─── Floating Status Overlay ───
  function addLog(msg) {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logs.push(`[${timeStr}] ${msg}`);
    console.log('[Amplify-FB-Group]', msg);
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
      <div style="font-weight:700;color:#38bdf8;margin-bottom:10px;border-bottom:1px solid #334155;padding-bottom:5px;">
        🤖 Amplify Auto Poster - Facebook Group
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;color:#cbd5e1;">
        ${logs.slice(-8).map(l => `<div>${l}</div>`).join('')}
      </div>
    `;
  }

  // ─── Click with React support ───
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
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type: mime});
  }

  // See extension/automators/x.js for rationale. Same MV3 sandbox fallback.
  function makeDataTransfer() {
    try {
      return new DataTransfer();
    } catch (e) {
      addLog('⚠️ DataTransfer unavailable in isolated world — using stub fallback');
      const items = [];
      return {
        items: {
          add: (file) => { items.push(file); },
        },
        get files() {
          return items;
        },
      };
    }
  }

  // ─── Smart element finder (từ reference) ───
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
    addLog('Khởi động Auto Poster - Facebook Group...');
    await sleep(2000);

    const stored = await chrome.storage.local.get('currentProcessingPost');
    const post = stored.currentProcessingPost;
    if (!post) {
      addLog('❌ Không tìm thấy dữ liệu bài đăng.');
      return;
    }

    // 1. Chuẩn bị ảnh (optional — Facebook group cho đăng text-only)
    let images = [];
    try {
      const raw = post.images || [];
      images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch(e) {}

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
        } catch(e) { addLog(`❌ Bị chặn tải ảnh [${i+1}]`); }
      }

      if (dt.files.length === 0) {
        addLog('⚠️ Không tải được ảnh nào — chuyển sang text-only.');
      }
    }

    // 2. Mở modal đăng bài
    addLog(`Đang tìm vị trí tạo bài viết...`);
    const fakeInputs = document.querySelectorAll('div[role="button"]');
    for (const el of fakeInputs) {
      const txt = (el.innerText || "").trim().toLowerCase();
      if (
        txt.includes('bạn viết gì đi') ||
        txt.includes('write something') ||
        txt.includes('tạo bài viết công khai') ||
        txt.includes('create a public post')
      ) {
        doClick(el);
        addLog(`✅ Đã bấm mở bảng Đăng bài!`);
        await sleep(2000);
        break;
      }
    }

    // 3. Tìm và đẩy ảnh vào file input (skip khi không có file)
    addLog(`Đang tìm khay chứa ảnh ẩn...`);
    let activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
    let fileInput = null;
    if (dt.files.length > 0) {
      fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');

      if (!fileInput) {
        addLog(`Không tìm thấy thẻ ẩn, thử bấm "Ảnh/video"...`);
        const photoBtn = await findSmartElement(["Ảnh/video", "Photo/video"], 3, true, activeModal);
        if (photoBtn) {
          doClick(photoBtn);
          await sleep(1500);
        }
        activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
        fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');
      }

      if (!fileInput) {
        throw new Error("Không thể tìm thấy vị trí chèn ảnh.");
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
    addLog(`Đang tìm ô soạn chữ...`);
    let editor = null;
    for(let i = 0; i < 8; i++) {
      const editorModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
      editor = editorModal.querySelector('[data-lexical-editor="true"], div[role="textbox"]');
      if (editor) break;
      await sleep(500);
    }

    if (!editor) throw new Error("Bảng đăng bài không tự bật.");

    addLog(`Đang nạp nội dung (mô phỏng gõ tay)...`);
    editor.focus();
    await sleep(500);
    const content = post.content || post.post_content || '';
    await humanTypeText(editor, content);
    addLog(`✅ Đã nạp xong nội dung.`);

    await sleep(2000);

    // 5. Bấm Đăng
    addLog(`Tìm nút Đăng...`);

    const finalKeywords = ["Đăng", "Post", "Share", "Chia sẻ"];
    const stepKeywords = ["Tiếp tục", "Tiếp", "Next", "Xong", "Done"];

    let steps = 0;
    let clickedPost = false;

    while (steps < 8 && !clickedPost) {
      addLog(`[Dò bước ${steps + 1}] Tìm nút...`);
      const activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;

      // 1. Strict match
      let btn = await findSmartElement(finalKeywords, 2, false, activeModal);
      if (btn) {
        addLog(`✅ Tìm thấy nút ĐĂNG!`);
        btn.click();
        clickedPost = true;
        break;
      }

      // 2. Strict match Next
      btn = await findSmartElement(stepKeywords, 2, false, activeModal);
      if (btn) {
        addLog(`➡️ Bấm Tiếp tục...`);
        btn.click();
        await sleep(2500);
        steps++;
        continue;
      }

      // 3. Fuzzy match Post
      btn = await findSmartElement(finalKeywords, 2, true, activeModal);
      if (btn && !btn.innerText.includes('Công khai') && !btn.getAttribute('aria-label')?.includes('Công khai')) {
        addLog(`✅ Tìm thấy nút Đăng (fuzzy).`);
        btn.click();
        clickedPost = true;
        break;
      }

      // 4. Fuzzy match Next
      btn = await findSmartElement(stepKeywords, 2, true, activeModal);
      if (btn) {
        addLog(`➡️ Bấm Tiếp tục (fuzzy)...`);
        btn.click();
        await sleep(2500);
        steps++;
        continue;
      }

      addLog(`⚠️ Không tìm thấy nút Đăng hoặc Tiếp tục.`);
      break;
    }

    if (!clickedPost) throw new Error("Không thể hoàn thành chu trình bấm nút Đăng.");

    // Extract target info
    let targetName = null;
    if (document.title) {
      targetName = document.title.split(' | ')[0].trim();
    }

    // Actor info extracted from post data (not from cookies)
    let actorUrl = post.actor_url || null;
    let actorName = post.actor_name || null;

    addLog(`✅ Bấm Đăng thành công!`);
    // Auto-like disabled: violates platform ToS (see lib/anti-detect.js)

    // Giữ tab thêm 1 chút
    addLog(`⏳ Giữ tab thêm (3-10s) để chống quét...`);
    await humanDelay();

    addLog(`🏁 HOÀN TẤT!`);
    await chrome.storage.local.remove('currentProcessingPost');
    chrome.runtime.sendMessage({
      action: 'postCompleted',
      postId: post.id,
      resultUrl: actorUrl || window.location.href,
      actorUrl,
      actorName,
      targetName
    });

  } catch (err) {
    addLog(`❌ LỖI: ${err.message}`);
    const stored = await chrome.storage.local.get('currentProcessingPost');
    const postId = stored.currentProcessingPost?.id;
    await chrome.storage.local.remove('currentProcessingPost');
    chrome.runtime.sendMessage({ action: 'postFailed', postId: postId, error: err.message });
  }
})();
}
