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

  const LOG_STORAGE_KEY = 'amplifyLog';
  const LOG_MAX_ENTRIES = 30; // giữ ~30 entry gần nhất, đủ để debug 1 phiên đăng.

  async function addLog(msg) {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    const line = `[${timeStr}] ${msg}`;
    logs.push(line);
    console.log('[Amplify-Threads]', msg);

    // Set lastStatus để tương thích với code cũ (status section hiện tại).
    try {
      chrome.storage.local.set({ lastStatus: msg });
    } catch (_) { /* swallow */ }

    // Append vào amplifyLog buffer (giữ popup hiển thị 6-8 dòng cuối
    // để user debug mà không cần mở DevTools).
    try {
      const cur = await new Promise((resolve) =>
        chrome.storage.local.get(LOG_STORAGE_KEY, (r) => resolve(r || {}))
      );
      const arr = Array.isArray(cur[LOG_STORAGE_KEY]) ? cur[LOG_STORAGE_KEY] : [];
      arr.push({ ts: Date.now(), channel: 'threads', msg });
      while (arr.length > LOG_MAX_ENTRIES) arr.shift();
      await new Promise((resolve) =>
        chrome.storage.local.set({ [LOG_STORAGE_KEY]: arr }, () => resolve())
      );
    } catch (_) { /* không chặn flow nếu storage lỗi */ }

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

  // Threads 2024+ có nhiều entry point mở compose modal. Trả về tên "cách"
  // đã thành công (dùng cho log), hoặc null nếu cả chain fail.
  async function openComposeModal() {
    // Bước 0: kiểm tra modal đã mở sẵn chưa (user có thể đã bấm tay trước).
    if (document.querySelector('div[aria-modal="true"][role="dialog"]')) {
      return 'modal-sẵn';
    }

    // ─── Cách 1: aria-label chuẩn (Web Threads dùng label EN/VN) ───
    const ariaSelectors = [
      // EN (Instagram cũng dùng 'Create' nhưng ở Threads thường là 'New thread' / 'Compose')
      '[aria-label="Compose"]',
      '[aria-label="New thread"]',
      '[aria-label="Create new post"]',
      '[aria-label="Start a thread"]',
      '[aria-label="Create"]',
      // VN
      '[aria-label="Viết"]',
      '[aria-label="Tạo thread"]',
      '[aria-label="Đăng bài"]',
      // Substring (fallback nếu label có số/ký tự phụ)
      '[aria-label*="New thread" i]',
      '[aria-label*="Compose" i]',
      '[aria-label*="Tạo thread" i]',
      '[aria-label*="Viết" i]',
      '[aria-label*="Create" i]',
      '[aria-label*="Start" i][aria-label*="thread" i]',
    ];
    for (const sel of ariaSelectors) {
      const el = document.querySelector(sel);
      if (el && !el.getAttribute('aria-disabled')) {
        doClick(el);
        await sleep(2000);
        if (document.querySelector('div[aria-modal="true"][role="dialog"]')) return `aria-label (${sel})`;
      }
    }

    // ─── Cách 2: text content của div[role=button] / span (legacy FB-style) ───
    const textKeywords = [
      'có gì mới', "what's new", 'what’s new', 'start a thread',
      'bắt đầu thread', 'viết', 'tạo thread', 'đăng bài', 'tạo bài viết',
    ];
    const inputCandidates = document.querySelectorAll(
      'div[role="button"], a[role="link"], span, button'
    );
    for (const el of inputCandidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const txt = (el.innerText || '').trim().toLowerCase();
      if (!txt) continue;
      if (textKeywords.some((k) => txt.includes(k))) {
        doClick(el);
        await sleep(2000);
        if (document.querySelector('div[aria-modal="true"][role="dialog"]')) return `text-content (${txt.slice(0, 30)})`;
      }
    }

    // ─── Cách 3: nút "+" thuần text (1 ký tự) ở header/bottom-nav ───
    const plusBtn = Array.from(document.querySelectorAll('div[role="button"], button, a[role="link"]'))
      .find((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (r.width > 80 || r.height > 80) return false; // tránh click nhầm card lớn
        const txt = (el.innerText || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        return txt === '+' || txt === '＋'
          || aria === '+' || /^(create|compose|new|add|viết|tạo)$/i.test(aria);
      });
    if (plusBtn) {
      doClick(plusBtn);
      await sleep(2000);
      if (document.querySelector('div[aria-modal="true"][role="dialog"]')) return 'nút "+" nhỏ';
    }

    // ─── Cách 4: icon compose SVG (fill="currentColor" trong path có dạng "edit/compose") ───
    // Threads dùng icon edit có đường path đặc trưng; ta click thẳng vào button cha.
    const iconComposeBtn = Array.from(document.querySelectorAll('a[role="link"], div[role="button"], button'))
      .find((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (r.width > 100 || r.height > 100) return false;
        // Có SVG bên trong và nằm ở header/top-bar (y < 200) HOẶC bottom-nav (y > 0.85 * viewport)
        const svg = el.querySelector('svg');
        if (!svg) return false;
        const yMid = r.top + r.height / 2;
        const isTop = yMid < 200;
        const isBottom = yMid > window.innerHeight * 0.85;
        return isTop || isBottom;
      });
    if (iconComposeBtn) {
      doClick(iconComposeBtn);
      await sleep(2000);
      if (document.querySelector('div[aria-modal="true"][role="dialog"]')) return 'icon SVG ở header/bottom';
    }

    return null;
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

    // Declare dt in outer scope so file-upload steps can check dt.files.length
    // (was previously only inside the `else` block, throwing `dt is not defined`
    // for text-only posts).
    let dt = null;

    if (images.length === 0) {
      addLog('⚠️ Không có ảnh — sẽ đăng text-only.');
    } else {
      addLog(`Chuẩn bị nạp ${images.length} ảnh...`);
      dt = makeDataTransfer();
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
    // Threads 2024+ UI gồm nhiều entry points để mở compose modal:
    //   - Nút "Viết" / "+" ở bottom nav (mobile) hoặc top-bar (desktop)
    //   - Nút "Có gì mới?" / "What's new?" / "Bắt đầu thread"
    //     (cũ, vẫn còn trên một số khu vực)
    //   - Sidebar item với aria-label="Create" / "Tạo thread"
    //   - Icon compose ✏️ (chỉ có SVG path, không có text/aria-label)
    // Ta thử theo thứ tự reliable-first → fallback chain cho tới khi mở được modal.
    addLog(`Tìm vị trí tạo bài viết...`);
    const composeOpened = await openComposeModal();
    addLog(composeOpened
      ? `✅ Đã mở compose modal (cách ${composeOpened}).`
      : `⚠️ Không tìm thấy nút mở compose — sẽ thử tìm editor trong page.`);

    let activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
    let fileInput = activeModal.querySelector('input[type="file"][accept*="image"], input[type="file"][accept*="video"]');

    // 3. Tìm và đẩy ảnh (skip khi không có file)
    addLog(`Tìm khay chứa ảnh ẩn...`);
    if (dt && dt.files.length > 0) {
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

    // 4. Điền text. Threads 2024+ có thể dùng nhiều selector cho editor:
    //   - [data-lexical-editor="true"] (cũ)
    //   - div[role="textbox"][contenteditable="true"]
    //   - [aria-label*="tạo thread" i] (container bao editor)
    //   - textarea (một số flow fallback)
    addLog(`Tìm ô soạn chữ...`);
    let editor = null;
    const editorSelectors = [
      '[data-lexical-editor="true"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][spellcheck]',
      'textarea[placeholder]',
      '[aria-label*="tạo thread" i] [contenteditable="true"]',
      '[aria-label*="Viết" i] [contenteditable="true"]',
      'div[contenteditable="true"]',
    ];

    for (let i = 0; i < 10; i++) {
      const editorModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
      for (const sel of editorSelectors) {
        const el = editorModal.querySelector(sel);
        if (el && el.offsetParent !== null) { // đảm bảo visible
          editor = el;
          break;
        }
      }
      if (editor) break;
      addLog(`  ⏳ Lần ${i + 1}/10 chưa thấy editor, retry...`);
      await sleep(500);
    }

    if (!editor) {
      addLog(`❌ Không tìm thấy editor trong ${10} lần thử.`);
      // Debug: log tất cả contenteditable elements + textbox elements
      const allCb = document.querySelectorAll('[contenteditable], [role="textbox"]').length;
      const dialogs = document.querySelectorAll('div[aria-modal="true"][role="dialog"]').length;
      addLog(`🔍 Debug: có ${allCb} contenteditable/textbox, ${dialogs} dialog(s) đang mở.`);
      throw new Error("Bảng đăng bài không tự bật.");
    }

    addLog(`✅ Tìm thấy editor (${editor.tagName}, role=${editor.getAttribute('role') || '-'}).`);

    addLog(`Nạp nội dung (mô phỏng gõ tay)...`);
    editor.focus();
    await sleep(500);
    const content = post.content || post.post_content || '';
    await humanTypeText(editor, content);
    addLog(`✅ Đã nạp xong ${content.length} ký tự.`);

    await sleep(2000);

    // 5. Bấm Đăng. Threads 2024+ dùng button label đa dạng:
    //   - "Post" / "Đăng" / "Chia sẻ" / "Post thread"
    //   - aria-label "Post" / "Đăng bài" / "Submit post"
    //   - data-testid*="post" / "PostButton"
    //   - Có thể nằm ở footer modal hoặc top-right của compose modal
    addLog(`Tìm nút Đăng...`);
    const finalKeywords = [
      'đăng', 'post', 'chia sẻ', 'share', 'post thread', 'submit',
      'đăng bài', 'publish', 'xuất bản',
    ];

    // Thử data-testid / aria-label đầu tiên (ổn định hơn text).
    const postSelectors = [
      'button[data-testid*="post" i]',
      'button[aria-label*="post" i][aria-label*="thread" i]',
      'button[aria-label*="đăng" i]',
      'button[aria-label*="Post" i]',
    ];

    let steps = 0;
    let clickedPost = false;

    while (steps < 4 && !clickedPost) {
      steps++;
      addLog(`[Bước ${steps}] Tìm nút Đăng...`);
      const activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;

      // 5a. Selector ưu tiên (data-testid / aria-label)
      for (const sel of postSelectors) {
        const candidates = activeModal.querySelectorAll(sel);
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (el.getAttribute('aria-disabled') === 'true') continue;
          // Bỏ qua nút "Đăng và chia sẻ ... khác" — chỉ lấy nút cùng trong modal footer.
          if (el.closest('[role="dialog"]') || el.closest('div[aria-modal="true"]')) {
            addLog(`✅ Tìm thấy nút Đăng qua ${sel}`);
            doClick(el);
            clickedPost = true;
            break;
          }
        }
        if (clickedPost) break;
      }
      if (clickedPost) break;

      // 5b. Strict text match
      let btn = await findSmartElement(finalKeywords, 2, false, activeModal);
      if (btn) {
        addLog(`✅ Tìm thấy nút Đăng (strict match).`);
        btn.click();
        clickedPost = true;
        break;
      }

      // 5c. Loose match
      btn = await findSmartElement(finalKeywords, 2, true, activeModal);
      if (btn) {
        addLog(`✅ Tìm thấy nút Đăng (loose match).`);
        doClick(btn);
        clickedPost = true;
        break;
      }

      addLog(`⚠️ Bước ${steps}: chưa thấy nút Đăng.`);
      await sleep(1500);
    }

    if (!clickedPost) {
      // Debug: log tất cả button trong modal để user check DevTools.
      const activeModal = document.querySelector('div[aria-modal="true"][role="dialog"]') || document;
      const allBtns = Array.from(activeModal.querySelectorAll('button')).map((b, i) => {
        const t = (b.innerText || '').trim().slice(0, 20);
        const a = b.getAttribute('aria-label') || '';
        return `#${i} [${t || a || b.tagName}]`;
      }).slice(0, 10);
      addLog(`🔍 Debug: ${allBtns.length} button(s) trong modal: ${allBtns.join(' | ')}`);
      throw new Error("Không thể hoàn thành chu trình bấm nút Đăng.");
    }

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
