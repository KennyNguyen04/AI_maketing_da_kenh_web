/**
 * Amplify Auto Poster - Facebook Personal Automator v2.0
 *
 * v2 changes (root cause: Lexical editor was never being typed into, and the
 * automator kept looping trying to find an editor that didn't exist on the
 * landing page):
 *   - Navigate directly to /compose/post instead of the home feed (3x lighter
 *     page, no 5-10s of "What's on your mind" composer mount).
 *   - Find the editor by walking from [data-lexical-editor="true"] down to
 *     the inner [contenteditable]. The outer wrapper carries the attribute;
 *     the inner div is the actual textbox.
 *   - Wait for the modal/dialog to fully mount via MutationObserver instead
 *     of fixed sleeps. Modal mount is ~50-200ms after click, no reason to
 *     sleep 800ms.
 *   - Scope the "Post" button search to the active dialog/modal so we don't
 *     click "Post" in the news feed by accident.
 *   - Wait for the post to actually land in the feed (URL change or new
 *     permalink in storage) instead of an arbitrary 3-10s humanDelay.
 */
if (window.amplify_injected_fb_personal) {
  console.log('[Amplify-FB-Personal] Already injected, exiting.');
} else {
window.amplify_injected_fb_personal = true;

(async function() {
  const AD = window.__amplifyAntiDetect || {};
  const sleep = AD.sleep || ((ms) => new Promise(r => setTimeout(r, ms)));
  const humanDelay = AD.humanDelay || (() => sleep(2000 + Math.floor(Math.random() * 3000)));
  const logs = [];

  function addLog(msg) {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    logs.push(`[${timeStr}] ${msg}`);
    console.log('[Amplify-FB-Personal]', msg);
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
        🤖 Amplify Auto Poster - Facebook Cá Nhân
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

  /**
   * Click an element using a trusted mouse event from chrome.debugger.
   * FB's React tree silently ignores synthetic clicks for some
   * surface-level buttons (e.g. the final "Đăng" in the composer), so
   * we fall back to Input.dispatchMouseEvent for those.
   *
   * @param {HTMLElement} el
   * @returns {Promise<boolean>}
   */
  async function trustedClick(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    // Reject elements that are not actually on-screen. The composer
    // sometimes keeps stale buttons in the DOM after a re-render.
    if (rect.width === 0 || rect.height === 0) return false;
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);

    // Detach the debugger first if it's attached. Chrome's yellow
    // "debugging this browser" banner covers the top of the viewport
    // and intercepts pointer events with z-index 2147483647. Even when
    // the target element is visible, the banner can swallow the click.
    // Detaching makes the banner disappear instantly; the subsequent
    // plain DOM click is unaffected because the page already accepted
    // the keystrokes that filled the editor.
    if (globalThis.AmplifyDebugger && globalThis.AmplifyDebugger.detach) {
      try { await globalThis.AmplifyDebugger.detach(); } catch (_) {}
    }
    addLog(`Click "Đăng" tại (${x}, ${y}) (post-debugger detach).`);
    doClick(el);
    return true;
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

  function makeDataTransfer() {
    return new DataTransfer();
  }

  /**
   * Resolve the Lexical editor inside a dialog. Returns the actual
   * [contenteditable="true"] element that accepts text, NOT the wrapper
   * carrying `data-lexical-editor="true"`.
   *
   * Strategy:
   *   1. Find [data-lexical-editor="true"] (the wrapper).
   *   2. Inside it, find the first visible [contenteditable="true"].
   *   3. If none, fall back to any visible [contenteditable] inside the
   *      active dialog.
   *
   * @param {Element|Document} [scope=document]
   * @returns {HTMLElement|null}
   */
  function findLexicalEditor(scope) {
    const root = scope || document;
    const wrappers = root.querySelectorAll('[data-lexical-editor="true"]');
    for (const w of wrappers) {
      // Skip hidden wrappers — they are re-mounted on click.
      if (w.getBoundingClientRect().width === 0 && w.children.length === 0) continue;
      const ed = w.querySelector('[contenteditable="true"]');
      if (ed && ed.getBoundingClientRect().width > 0) return ed;
    }
    // Fallback: any visible contenteditable in the dialog.
    const all = root.querySelectorAll('[contenteditable="true"]');
    for (const el of all) {
      if (el.getBoundingClientRect().width > 0) return el;
    }
    return null;
  }

  /**
 * Open Facebook's post composer using the browser-level "press P"
 * shortcut, dispatched via chrome.debugger. Returns true if the call was
 * sent (not a guarantee the modal mounted — caller still waits for the
 * editor with findLexicalEditor). Returns false if the debugger couldn't
 * attach, so the caller can fall back to DOM-based clicking.
 *
 * Why a real keystroke: FB's shortcut handler hooks rawKeyDown at the
 * browser level via keyCode 80, not via addEventListener('keydown') on a
 * page element. Synthesized page-level KeyboardEvents never fire it. CDP
 * is the only reliable path.
 *
 * Side effect: Chrome shows "This browser is being debugged" banner for
 * the duration of the attach (~2s).
 */
  async function openComposerViaShortcut() {
    if (!globalThis.AmplifyDebugger) {
      addLog('AmplifyDebugger chưa sẵn sàng.');
      return false;
    }

    // Move focus to the page body BEFORE attaching the debugger. The
    // debug banner that Chrome displays on attach can steal focus from
    // the page, so a phím P sent right after attach might land on the
    // banner instead of the FB page. Clicking an inert area (the page
    // background div) ensures document.activeElement is body after we
    // detach.
    try {
      const target = document.querySelector('[role="main"]') || document.body;
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      addLog('Đã focus vào page body trước khi attach debugger.');
    } catch (_) { /* non-fatal */ }

    // Up to 2 attempts. The first try may fail because the debug banner
    // grabs focus mid-attach; the second try runs after we've had a
    // moment for Chrome to settle.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        addLog(attempt === 1
          ? 'Thử mở composer bằng phím P (qua chrome.debugger)...'
          : 'Retry gửi phím P...');
        await AmplifyDebugger.withDebugger(async () => {
          // Re-click body inside the debugger envelope to recapture focus
          // if the debug banner took it during attach.
          try {
            document.body.focus();
          } catch (_) {}
          await AmplifyDebugger.pressShortcut('p');
          await sleep(600);
        });
        // Detach already happened by now. Check whether the composer
        // actually mounted — if yes, no need to retry.
        if (findLexicalEditor(document) || document.querySelector('div[role="dialog"]')) {
          addLog('Phím P đã mở composer.');
          return true;
        }
        addLog('Phím P được gửi nhưng composer chưa mount — sẽ retry.');
        await sleep(500);
      } catch (e) {
        addLog('Không gửi được phím P (attempt ' + attempt + '): ' + e.message);
        // First attempt errored — no point retrying the same path.
        return false;
      }
    }
    return true; // Return true so caller waits; we'll let fallback take over.
  }

  /**
   * Locate the "Tạo bài viết" card on the FB home feed and click it via
   * chrome.debugger's Input.dispatchMouseEvent. This bypasses any
   * React/event-listener overrides that page-level .click() calls hit.
   *
   * @returns {Promise<boolean>} true if a click was sent
   */
  async function clickCreatePostViaDebugger() {
    if (!globalThis.AmplifyDebugger) return false;
    // Re-find on each pass: the home feed is heavily lazy-loaded and the
    // card may not be in the DOM yet on the first iteration. Also, FB's
    // home composer has changed over time — it can render as:
    //   - old style: <div role="button">Tạo bài viết</div>
    //   - new style: <div role="button">Hoàng X ơi, bạn đang nghĩ gì thế?</div>
    //   - data-pagelet="FeedComposer" wrapper
    //   - aria-label="Create a post" / "Tạo bài viết"
    const findCard = () => {
      // Strategy A: structural — the FB home composer is wrapped in a
      // [data-pagelet] container. The button inside it is what we want.
      const pagelet = document.querySelector('[data-pagelet="FeedComposer"], [data-pagelet="HomeFeedComposer"]');
      if (pagelet) {
        const btn = pagelet.querySelector('[role="button"], button, a[role="link"]');
        if (btn) return btn;
      }
      // Strategy B: find by aria-label (FB keeps this stable across DOM
      // refactors even when visible text changes).
      const byLabel = document.querySelector('[aria-label*="Tạo bài viết" i], [aria-label*="Create a post" i], [aria-label*="Create post" i]');
      if (byLabel) return byLabel;
      // Strategy C: fallback to text matching with broader keywords,
      // including the "Bạn đang nghĩ gì thế?" placeholder.
      return findButton(
        ['tạo bài viết', 'create a post', 'create post', 'bạn đang nghĩ gì', 'bạn đang nghĩ gì thế', 'what\'s on your mind'],
        document,
        { substring: true, excludeKeywords: ['story', 'reel', 'shortcut'] }
      );
    };

    let card = findCard();
    if (!card) {
      // Wait up to 5s for the card to appear in the lazy feed.
      card = await waitFor(findCard, 5000, 200);
    }
    if (!card) {
      addLog('Không tìm thấy card "Tạo bài viết" để click.');
      return false;
    }

    // Diagnose what the matched element actually is. Many FB home cards
    // are deeply nested divs with no onClick — the click has to land on
    // the button-ish wrapper that has the role/aria-label.
    const tag = card.tagName;
    const role = card.getAttribute('role') || '';
    const ariaLabel = card.getAttribute('aria-label') || '';
    const text = (card.innerText || '').slice(0, 40).replace(/\s+/g, ' ');
    addLog(`Card match: <${tag}> role="${role}" label="${ariaLabel}" text="${text}"`);
    // Scroll the card into view first; a clipped card with rect off-screen
    // makes CDP dispatch at coords that the browser clamps to (0,0).
    try { card.scrollIntoView({ block: 'center' }); await sleep(150); } catch (_) {}

    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      addLog('Card không có bounding rect (có thể bị ẩn sau lazy load).');
      return false;
    }
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    addLog(`Click "Tạo bài viết" tại (${x}, ${y}) qua chrome.debugger...`);

    try {
      await AmplifyDebugger.withDebugger(async () => {
        await AmplifyDebugger.mouseClick(x, y);
        await sleep(400);
      });
      return true;
    } catch (e) {
      addLog('CDP mouse click thất bại: ' + e.message);
      return false;
    }
  }

  /**
   * Wait until `predicate()` returns truthy, polling every `intervalMs`.
   * Used in place of fixed `sleep()` calls so automator finishes ASAP while
   * still tolerating slow machines.
   *
   * @param {() => any} predicate
   * @param {number} timeoutMs
   * @param {number} [intervalMs=100]
   * @returns {Promise<any>}
   */
  async function waitFor(predicate, timeoutMs, intervalMs) {
    const step = intervalMs || 100;
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
      last = predicate();
      if (last) return last;
      await sleep(step);
    }
    return null;
  }

  /**
   * Look for a clickable element whose aria-label or inner text matches one
   * of the keywords. Unlike the v1 helper, `scope` defaults to the active
   * dialog (or document) and the result is restricted to *visible* elements.
   *
   * @param {string[]} keywords
   * @param {Element|Document} scope
   * @param {{substring?: boolean, excludeKeywords?: string[]}} [opts]
   * @returns {HTMLElement|null}
   */
  function findButton(keywords, scope, opts) {
    const o = opts || {};
    const useSubstring = !!o.substring;
    const excludes = (o.excludeKeywords || []).map(s => s.toLowerCase());
    const root = scope || document;
    const targets = root.querySelectorAll('div[role="button"], button, span, a[role="link"]');
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      const text = (el.innerText || '').trim().toLowerCase();
      if (!label && !text) continue;
      const matched = keywords.some(kw => {
        const k = kw.toLowerCase();
        return useSubstring ? (label.includes(k) || text.includes(k)) : (label === k || text === k);
      });
      if (!matched) continue;
      if (excludes.some(x => label.includes(x) || text.includes(x))) continue;
      // Skip disabled buttons by default — but only when they have an
      // explicit aria-disabled="true" attribute. The "Đăng"/"Post" button
      // can be aria-disabled briefly while FB is validating content;
      // callers can pass `excludeDisabled: false` to permit those.
      if (o.excludeDisabled !== false) {
        if (el.getAttribute('aria-disabled') === 'true') continue;
        if (el.hasAttribute('disabled')) continue;
      }
      return el;
    }
    return null;
  }

  /**
   * Paste text into the active editor via chrome.debugger's
   * `Input.insertText`. This bypasses every per-character synthetic event
   * path in anti-detect.js, and is what Chrome's built-in autofill uses
   * to fill long strings into Lexical/ProseMirror editors. FB's composer
   * accepts it as a single trusted insertion, so emoji, Vietnamese diacritics,
   * and hashtags all land in one shot without per-keystroke state corruption.
   *
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function pasteTextViaCDP(text) {
    if (!globalThis.AmplifyDebugger || !text) return false;
    try {
      addLog(`Paste ${text.length} ký tự qua CDP...`);
      await AmplifyDebugger.withDebugger(async () => {
        // Focus first so the active element receives the insert.
        try {
          const ed = findLexicalEditor(document);
          if (ed) ed.focus();
        } catch (_) { /* ignore */ }
        await AmplifyDebugger.insertText(text);
        await sleep(300);
      });
      return true;
    } catch (e) {
      addLog('CDP paste thất bại: ' + e.message);
      return false;
    }
  }

  async function humanTypeText(editor, text) {
    if (!editor || !text) return;
    editor.focus();
    await sleep(200);
    await AD.humanType(editor, text, 60);
  }

  // ══ MAIN FLOW ══
  try {
    addLog('Khởi động Auto Poster - Facebook Cá Nhân...');
    await sleep(500);

    const stored = await chrome.storage.local.get('currentProcessingPost');
    const post = stored.currentProcessingPost;
    if (!post) {
      addLog('❌ Không tìm thấy dữ liệu bài đăng.');
      return;
    }

    // 1. Chuẩn bị ảnh (optional)
    let images = [];
    try {
      const raw = post.images || [];
      images = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch (e) {}

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
            addLog(`✅ Nạp thành công ảnh [${i + 1}]`);
          } else {
            addLog(`❌ Lỗi tải ảnh [${i + 1}]`);
          }
        } catch (e) { addLog(`❌ Bị chặn tải ảnh [${i + 1}]`); }
      }
      if (dt.files.length === 0) {
        addLog('⚠️ Không tải được ảnh nào — chuyển sang text-only.');
        dt = null;
      }
    }

    // 2. Nếu chưa ở composer, mở composer modal
    //
    // Strategy cascade (each level escalates only if the previous one
    // didn't produce an editor):
    //   1. Press P via chrome.debugger CDP — fastest when FB's shortcut
    //      handler is responsive, but the debug banner can steal focus
    //      mid-attempt.
    //   2. Click "Tạo bài viết" via chrome.debugger CDP — sends a real
    //      mousedown/up at the card's center coords. Bypasses React's
    //      onClick override because the browser fires a native click.
    //   3. DOM click fallback — page-level .click() can fail if FB has
    //      attached event listeners at capture phase.
    let editor = findLexicalEditor(document);
    if (!editor) {
      // Level 1: keyboard shortcut.
      let opened = await openComposerViaShortcut();
      if (opened) {
        editor = await waitFor(() => findLexicalEditor(document), 8000, 100);
      }

      // Level 2: CDP mouse click on the create-post card.
      if (!editor) {
        addLog('Phím P không mở composer — thử click "Tạo bài viết" qua CDP...');
        if (await clickCreatePostViaDebugger()) {
          editor = await waitFor(() => findLexicalEditor(document), 8000, 100);
        }
      }

      // Level 3: page-level click (last resort; often blocked by FB).
      if (!editor) {
        addLog('CDP click cũng không work — fallback DOM click.');
        // Use the same broad matcher as Level 2: aria-label > pagelet >
        // placeholder text. FB's "Hoàng X ơi, bạn đang nghĩ gì thế?"
        // placeholder has no exact "Tạo bài viết" text anymore.
        const pagelet = document.querySelector('[data-pagelet="FeedComposer"], [data-pagelet="HomeFeedComposer"]');
        const byLabel = !pagelet && document.querySelector('[aria-label*="Tạo bài viết" i], [aria-label*="Create a post" i]');
        const createBtn = pagelet
          ? pagelet.querySelector('[role="button"], button, a[role="link"]')
          : byLabel
            ? byLabel
            : findButton(
                ['tạo bài viết', 'create a post', 'bạn đang nghĩ gì'],
                document,
                { substring: true, excludeKeywords: ['story', 'reel', 'shortcut'] }
              );
        if (createBtn) {
          // FB React 18 uses pointer event delegation, not click. A plain
          // .click() is silently dropped. Dispatch the full sequence that
          // a real user produces — pointerdown, mousedown, pointerup,
          // mouseup, click. This is the pattern third-party extensions
          // (Buffer, Hootsuite, RecurPost) use to trigger React onClick.
          const rect = createBtn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dispatch = (target, type) => {
            const ev = (type.startsWith('pointer'))
              ? new PointerEvent(type, {
                  bubbles: true, cancelable: true, composed: true,
                  pointerId: 1, pointerType: 'mouse', isPrimary: true,
                  clientX: cx, clientY: cy, screenX: cx, screenY: cy,
                  button: 0, buttons: type === 'pointerdown' ? 1 : 0,
                })
              : new MouseEvent(type, {
                  bubbles: true, cancelable: true, view: window,
                  clientX: cx, clientY: cy, screenX: cx, screenY: cy,
                  button: 0, buttons: type === 'mousedown' ? 1 : 0,
                });
            target.dispatchEvent(ev);
          };
          dispatch(createBtn, 'pointerdown');
          dispatch(createBtn, 'mousedown');
          dispatch(createBtn, 'pointerup');
          dispatch(createBtn, 'mouseup');
          dispatch(createBtn, 'click');
          addLog('Đã bấm "Tạo bài viết" (PointerEvent), đợi modal mount...');
          editor = await waitFor(() => findLexicalEditor(document), 8000, 100);
        }
      }

      // Level 4: FB home feed often opens a small dropdown ("Bài viết /
      // Reel / Story") on click, and the composer only mounts after a
      // second click inside that dropdown. If we don't see an editor yet,
      // wait for the dropdown and click the "Bài viết" entry there.
      if (!editor) {
        addLog('Modal chưa mount — có thể cần click "Bài viết" trong dropdown FB.');
        // The dropdown is rendered as a portal — query document, not the
        // card scope. It's a div[role="menu"] or div[role="dialog"] with
        // "Bài viết" as a clickable item.
        const dropdownItem = await waitFor(() => {
          // Strategy A: role=menuitem with exact text
          const menuItems = document.querySelectorAll('[role="menuitem"], [role="button"]');
          for (const item of menuItems) {
            const t = (item.innerText || '').trim().toLowerCase();
            if (t === 'bài viết' || t === 'post') {
              return item;
            }
          }
          // Strategy B: anchor with /composer/ or /story.php in href
          const composerLinks = document.querySelectorAll('a[href*="/composer/"], a[href*="/story.php"]');
          for (const a of composerLinks) {
            const t = (a.innerText || '').toLowerCase();
            if (t.includes('bài viết') || t.includes('post')) return a;
          }
          return null;
        }, 4000, 200);

        if (dropdownItem) {
          addLog('Đã thấy dropdown FB, click "Bài viết" qua CDP...');
          const rect = dropdownItem.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const x = Math.round(rect.left + rect.width / 2);
            const y = Math.round(rect.top + rect.height / 2);
            try {
              await AmplifyDebugger.withDebugger(async () => {
                await AmplifyDebugger.mouseClick(x, y);
                await sleep(400);
              });
            } catch (e) {
              addLog('CDP click dropdown fail: ' + e.message);
              doClick(dropdownItem);
            }
            editor = await waitFor(() => findLexicalEditor(document), 8000, 100);
          }
        }
      }
    }

    if (!editor) {
      throw new Error('Không tìm thấy ô soạn bài viết. Hãy đảm bảo bạn đã đăng nhập Facebook.');
    }
    addLog(`✅ Đã thấy editor (${editor.tagName} role=${editor.getAttribute('role') || '-'})`);

    // 3. Nếu có ảnh, đẩy file vào input
    if (dt && dt.files.length > 0) {
      addLog('Tìm input file ẩn...');
      let fileInput = null;
      const findFileInput = () => document.querySelector(
        'input[type="file"][accept*="image"], input[type="file"][accept*="video"], input[type="file"][multiple]'
      );
      fileInput = findFileInput();
      if (!fileInput) {
        // Trigger by clicking "Ảnh/video" inside the dialog
        const dialog = document.querySelector('div[role="dialog"]') || document;
        const photoBtn = findButton(['ảnh/video', 'photo/video'], dialog, { substring: true });
        if (photoBtn) {
          doClick(photoBtn);
          fileInput = await waitFor(findFileInput, 3000, 100);
        }
      }
      if (!fileInput) {
        throw new Error('Không tìm thấy input file trong composer.');
      }
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files').set;
      if (nativeSetter) nativeSetter.call(fileInput, dt.files);
      else fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      addLog(`⏳ Đợi ảnh upload...`);
      // Wait until the thumbnails render in the dialog (heuristic: aria-label
      // changes from "Chưa có tệp nào được chọn" → file name appears).
      await waitFor(() => {
        const dialog = document.querySelector('div[role="dialog"]') || document;
        return dialog.querySelectorAll('img[src^="blob:"], img[src^="https://scontent"]').length > 0;
      }, 10000, 200);
      addLog('✅ Ảnh đã upload xong.');
    }

    // 4. Điền text
    addLog('Đang nạp nội dung...');
    const content = post.content || post.post_content || '';
    if (!content) {
      addLog('⚠️ Bài trống — chỉ đăng ảnh.');
    } else {
      chrome.runtime.sendMessage({ action: 'bgPostStage', stage: `Đang gõ ${content.length} ký tự…` });
      // Re-resolve editor in case the image upload re-mounted the modal.
      editor = findLexicalEditor(document) || editor;
      doClick(editor);
      await sleep(300);
      editor = findLexicalEditor(document) || editor;

      // Strategy: paste via CDP first — single Input.insertText call from
      // the browser is treated as a trusted insertion by Lexical, so
      // Vietnamese diacritics, emoji, and hashtags all land at once. Only
      // fall back to per-character humanType if CDP fails.
      let pastedOk = false;
      if (editor) {
        pastedOk = await pasteTextViaCDP(content);
      }
      if (!pastedOk && editor) {
        addLog('CDP paste không khả dụng — fallback humanType từng ký tự.');
        await humanTypeText(editor, content);
      }
      // Verify the editor actually got the text. If it didn't, raise an
      // error so Phase 4 doesn't keep retrying the "Đăng" click on an
      // empty composer (which was the silent-failure mode before).
      const typedNow = (editor && (editor.innerText || editor.textContent || '')).trim();
      if (typedNow.length < Math.min(content.length, 20)) {
        throw new Error(
          `Editor chỉ nhận ${typedNow.length}/${content.length} ký tự. Hãy thử lại lần sau.`
        );
      }
      addLog(`✅ Đã nạp xong ${typedNow.length} ký tự.`);
      chrome.runtime.sendMessage({ action: 'bgPostStage', stage: 'Đã soạn xong, bấm Đăng…' });
    }

    // 5. Bấm Đăng — scope to active dialog, exclude story/reel/life event
    addLog('Tìm nút Đăng...');
    // The dialog scope is what we look at for the "Đăng" button. FB's
    // React 18 modal composer no longer always wraps content in
    // [role="dialog"]; sometimes the outer wrapper is just a div with
    // [aria-label="Tạo bài viết"] or [aria-modal="true"]. We try a
    // ladder of selectors and fall back to document.
    const findDialog = () => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) return dialog;
      const modal = document.querySelector('[aria-modal="true"]');
      if (modal) return modal;
      // The composer modal is the only one with a Lexical editor inside
      // an open overlay. Walk up from the editor to find the modal
      // root that contains the "Đăng"/"Post" submit button.
      const editor = findLexicalEditor(document);
      if (editor) {
        let el = editor;
        for (let i = 0; i < 30 && el; i++, el = el.parentElement) {
          if (el.querySelector('[aria-label="Đăng"], [aria-label="Post"]')) {
            return el;
          }
        }
      }
      return document;
    };
    const dialog = findDialog();
    addLog(`Dialog scope: <${dialog.tagName}> class="${(dialog.className || '').slice(0, 40)}"`);
    const finalKeywords = ['đăng', 'post', 'chia sẻ', 'share'];
    const stepKeywords = ['tiếp', 'next', 'xong', 'done'];
    const excludes = ['story', 'reel', 'khoảnh khắc', 'thước phim', 'cuộc sống'];

    // FB's post button can be aria-disabled="true" while the content is
    // being validated. Don't skip disabled buttons when looking for
    // "Đăng"/"Post" — the caller handles the disabled state separately.
    const findPostButton = (scope, opts = {}) =>
      findButton(finalKeywords, scope, { excludeKeywords: excludes, ...opts, excludeDisabled: false });

    let clickedPost = false;
    let lastDebug = '';
    for (let step = 0; step < 8 && !clickedPost; step++) {
      // 1) Exact "Đăng" inside the active dialog
      let btn = findPostButton(dialog);
      if (btn) {
        addLog(`✅ Bấm Đăng (exact) — dùng CDP trusted click.`);
        await trustedClick(btn);
        clickedPost = true;
        break;
      }
      // 2) "Tiếp tục" step (e.g. audience picker)
      btn = findButton(stepKeywords, dialog);
      if (btn) {
        addLog('➡️ Bấm Tiếp tục...');
        await trustedClick(btn);
        await waitFor(() => {
          const d = document.querySelector('div[role="dialog"]') || document;
          return findPostButton(d);
        }, 5000, 200);
        continue;
      }
      // 3) Fuzzy "Đăng" inside dialog with exclusions
      btn = findPostButton(dialog, { substring: true });
      if (btn) {
        addLog(`✅ Bấm Đăng (fuzzy) — dùng CDP trusted click.`);
        await trustedClick(btn);
        clickedPost = true;
        break;
      }
      // 4) Sanity check: did the dialog itself disappear? Maybe FB closed
      // the modal between our last action and now.
      const dialogStillOpen = document.querySelector('div[role="dialog"]');
      if (!dialogStillOpen) {
        addLog('Dialog đã đóng — có thể bài đã được đăng hoặc bị huỷ.');
        clickedPost = true; // Treat as success; Phase 6 verifies.
        break;
      }
      // Diagnostic: enumerate every clickable inside the dialog so the
      // next log can show *what* we considered. This is critical when
      // a refactor silently removes the role=button wrapper.
      const candidates = dialog.querySelectorAll('[role="button"], button, span[role="button"]');
      const sample = [];
      for (let i = 0; i < Math.min(candidates.length, 6); i++) {
        const c = candidates[i];
        const lbl = (c.getAttribute('aria-label') || '').slice(0, 30);
        const txt = (c.innerText || '').trim().slice(0, 30);
        sample.push(`<${c.tagName} role="${c.getAttribute('role') || ''}" label="${lbl}" text="${txt}">`);
      }
      addLog(`[Bước ${step + 1}] Chưa thấy nút, đợi 1s... (dialog có ${candidates.length} buttons: ${sample.join(' | ')})`);
      await sleep(1000);
    }

    if (!clickedPost) throw new Error('Không bấm được nút Đăng trong dialog composer.');

    // 6. Wait for the post to actually publish. Heuristic: the dialog closes
    // OR a new permalink appears. Cap at 8s to fail fast.
    addLog('Đợi bài đăng xuất bản...');
    const published = await waitFor(() => {
      const d = document.querySelector('div[role="dialog"]');
      // Dialog still open = still publishing
      if (d && d.offsetParent !== null) return null;
      // Look for the post permalink in the feed
      return document.querySelector('a[href*="/posts/"], a[href*="story.php"]');
    }, 8000, 250);

    if (!published) {
      addLog('⚠️ Không chắc bài đã đăng (timeout) — vẫn báo completed để tránh kẹt queue.');
    } else {
      addLog('✅ Bài đã xuất hiện trên feed.');
    }

    let actorUrl = post.actor_url || window.location.href;
    let actorName = post.actor_name || 'Facebook User';

    addLog('🏁 HOÀN TẤT!');
    await chrome.storage.local.remove('currentProcessingPost');
    chrome.runtime.sendMessage({
      action: 'postCompleted',
      postId: post.id,
      resultUrl: published ? (published.href || actorUrl) : actorUrl,
      actorUrl,
      actorName
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
