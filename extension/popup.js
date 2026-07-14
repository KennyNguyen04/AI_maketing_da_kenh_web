document.addEventListener('DOMContentLoaded', async () => {
  const tokenInput = document.getElementById('token');
  const apiUrlInput = document.getElementById('api-url');
  const saveBtn = document.getElementById('saveBtn');
  const connDot = document.getElementById('conn-dot');
  const connText = document.getElementById('conn-text');
  const statusSection = document.getElementById('status-section');
  const statsSection = document.getElementById('stats-section');
  const statPending = document.getElementById('stat-pending');
  const statCompletedToday = document.getElementById('stat-completed-today');
  const statCompletedTotal = document.getElementById('stat-completed-total');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusDetail = document.getElementById('status-detail');

  let nextTaskTimeGlobal = null;

  // ─── Status snapshot cache ───
  //
  // Reading chrome.storage.local from the popup forces the service worker
  // to wake, which adds 200-1500ms of latency on every popup open (and on
  // every 1s tick of the interval below). We mirror the most recent render
  // state to chrome.storage.session — an in-memory only store that's
  // accessible across popup open/close within the same browser session
  // without any SW round trip. The popup renders from the snapshot first
  // (instant), then refreshes from storage.local in the background. Only
  // the *background* (service worker) writes the snapshot, so the popup
  // can trust it as the extension's last known state.
  const SNAPSHOT_KEY = 'statusSnapshot';

  // ─── Load saved data ───
  const stored = await chrome.storage.local.get(['api_token', 'api_base']);

  if (stored.api_token) {
    tokenInput.value = stored.api_token;
    if (stored.api_base) apiUrlInput.value = stored.api_base;
    setConnected(true);
    showMainUI();
    await loadStats();
  } else {
    setConnected(false);
    showMainUI();
  }

  // Read last-known state synchronously from session storage. This is the
  // hot-path that removes "Đang tải trạng thái..." — the popup already
  // knows what it was displaying before it was last closed.
  try {
    const snap = await chrome.storage.session.get(SNAPSHOT_KEY);
    if (snap && snap[SNAPSHOT_KEY]) {
      applyRender(snap[SNAPSHOT_KEY]);
    }
  } catch (_) {
    // chrome.storage.session is MV3 only and graceful when missing.
  }

  // Pull the latest from chrome.storage.local in the background. This is
  // authoritative but slow; only used to update the cache, not to delay
  // the first paint.
  refreshFromStorage();

  // ─── Status rendering ───
  //
  // render state comes from a single object so we can both (a) apply it to
  // the DOM and (b) snapshot it back to chrome.storage.session for next
  // popup open. Apply this when storage.local changes (via broadcast) or
  // when the timer ticks for "next task time" countdown.
  function applyRender(d) {
    if (!d) return;

    if (d.tokenExpired) {
      statusIcon.textContent = '🔑';
      statusTitle.textContent = 'Token hết hạn';
      statusTitle.style.color = '#dc2626';
      statusDetail.textContent = d.lastStatus || 'Vui lòng kết nối lại.';
      statusDetail.style.color = '#dc2626';
      setConnected(false, '❌ Token hết hạn');
      cacheSnapshot(d);
      return;
    }

    if (d.pendingPreview) {
      showPreviewSection(d.pendingPreview);
    } else {
      hidePreviewSection();
    }

    if (d.nextTaskTime) nextTaskTimeGlobal = d.nextTaskTime;

    if (d.outOfCredits) {
      statusIcon.textContent = '❌';
      statusTitle.textContent = 'Tài khoản đã hết điểm!';
      statusTitle.style.color = '#ef4444';
      statusDetail.innerHTML = '<span style="font-weight:500;">Hệ thống đã dừng đăng bài.</span><br/>Vui lòng nạp thêm điểm để tiếp tục.';
      statusDetail.style.color = '#dc2626';
      const pb = document.getElementById('pauseBtn'); if (pb) pb.style.display = 'none';
      cacheSnapshot(d);
      return;
    }

    const pb = document.getElementById('pauseBtn'); if (pb) pb.style.display = '';
    const sb = document.getElementById('scanBtn'); if (sb) sb.style.display = '';

    if (d.currentProcessingPost) {
      const p = d.currentProcessingPost;
      const channelNames = {
        facebook: 'Facebook',
        'facebook-group': 'Facebook Group',
        threads: 'Threads',
        instagram: 'Instagram',
        x: 'X (Twitter)'
      };
      const platformName = channelNames[p.channel] || p.channel;

      statusIcon.textContent = '⚡';
      statusTitle.textContent = `Đang đăng lên ${platformName}`;
      statusTitle.style.color = '#059669';
      statusDetail.textContent = d.lastStatus || 'Khởi động...';
      statusDetail.style.color = '#374151';
      cacheSnapshot(d);
      return;
    }

    if (d.isPaused) {
      statusIcon.textContent = '⏸';
      statusTitle.textContent = 'Hệ thống tạm dừng';
      statusTitle.style.color = '#ef4444';
      statusDetail.textContent = 'Bấm Tiếp tục để quét bài lại.';
      statusDetail.style.color = '#dc2626';
      cacheSnapshot(d);
      return;
    }

    if (nextTaskTimeGlobal) {
      const nextTimeMs = new Date(nextTaskTimeGlobal).getTime();
      const diffS = Math.floor((nextTimeMs - Date.now()) / 1000);

      if (diffS > 0) {
        const m = Math.floor(diffS / 60);
        const s = diffS % 60;
        const timeStr = `${m > 0 ? m + 'p ' : ''}${s}s`;
        const targetTimeStr = new Date(nextTimeMs).toLocaleTimeString('vi-VN', {
          hour: '2-digit', minute: '2-digit'
        });

        statusIcon.textContent = '⏳';
        statusTitle.textContent = `Chờ bài lúc ${targetTimeStr}`;
        statusTitle.style.color = '#0284c7';
        statusDetail.textContent = `Hệ thống sẽ chạy tiếp trong khoảng ${timeStr}.`;
        statusDetail.style.color = '#6b7280';
      } else {
        statusIcon.textContent = '⏳';
        statusTitle.textContent = `Đang quét bài mới...`;
        statusTitle.style.color = '#0284c7';
        statusDetail.textContent = 'Đã đến giờ đăng bài. Đang chờ hệ thống...';
        statusDetail.style.color = '#6b7280';
      }
      cacheSnapshot(d);
      return;
    }

    // Show "🔄 Reset N task kẹt" badge for 30s after a resync found stuck tasks.
    // Stored by background.js after POST /api/extension/resync returns ok with
    // reset_count > 0. Rendered as part of the idle state so user sees the
    // recovery happen without having to dig into console logs.
    let resyncNote = '';
    if (d.lastResync && d.lastResync.at && d.lastResync.resetCount > 0) {
      const ageMs = Date.now() - d.lastResync.at;
      if (ageMs < 30_000) {
        resyncNote = ` · 🔄 Reset ${d.lastResync.resetCount} task kẹt`;
      } else {
        // Stale — clear it so future renders don't keep showing it forever.
        chrome.storage.local.remove('lastResync');
      }
    }

    statusIcon.textContent = '✓';
    statusTitle.textContent = `Sẵn sàng`;
    statusTitle.style.color = '#6b7280';
    statusDetail.textContent = `Extension đang chờ việc. Quét lại sau mỗi ~1 phút.${resyncNote}`;
    statusDetail.style.color = '#9ca3af';
    cacheSnapshot(d);
  }

  function cacheSnapshot(d) {
    // Best-effort write — chrome.storage.session may be unavailable in some
    // MV2 fallback modes, but errors here just mean the next popup open
    // will fetch from storage.local again. No functional loss.
    try {
      chrome.storage.session.set({ [SNAPSHOT_KEY]: d });
    } catch (_) { /* graceful */ }
  }

  async function refreshFromStorage() {
    const d = await chrome.storage.local.get([
      'currentProcessingPost', 'lastStatus', 'nextTaskTime', 'outOfCredits',
      'isPaused', 'pendingPreview', 'tokenExpired', 'lastResync'
    ]);
    applyRender({
      currentProcessingPost: d.currentProcessingPost,
      lastStatus: d.lastStatus,
      nextTaskTime: d.nextTaskTime,
      outOfCredits: d.outOfCredits,
      isPaused: d.isPaused,
      pendingPreview: d.pendingPreview,
      tokenExpired: d.tokenExpired,
      lastResync: d.lastResync,
    });
  }

  // ─── Event-driven updates ───
  //
  // Background broadcasts 'bgPostState' on every storage change. We listen
  // for those and refresh instantly, removing the 1s polling lag. We still
  // keep a slower interval (3s) for the countdown timer ('Chờ bài lúc …')
  // which needs to tick continuously.
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.action === 'bgPostState') {
      // Force refresh from storage.local — the actual data is there, not
      // in the broadcast payload (background sends only the changed ref).
      refreshFromStorage();
    }
  });

  // 3-second tick is enough to update the countdown text. The status only
  // changes when the background fires bgPostState (start/end of task), so
  // polling chrome.storage.local every 1s was burning IPC budget for no
  // visible change. Storage.session still gets the latest on every tick.
  setInterval(() => {
    refreshFromStorage();
  }, 3000);

  // ─── Tab switching ───
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.style.display = p.dataset.tabPanel === tab ? 'block' : 'none';
      });
      if (tab === 'repost') loadRecentDrafts();
    });
  });

  // ─── Save credentials ───
  saveBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const apiBase = apiUrlInput.value.trim() || 'http://localhost:3000';

    if (!token) {
      setConnected(false, 'Vui lòng nhập Token');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang kết nối...';

    // Try multiple possible API endpoints.
    // Normalize: strip trailing slash so we don't get //api double-slash.
    const normalizeUrl = (u) => (u || '').replace(/\/+$/, '');
    const candidate = normalizeUrl(apiBase);
    const possibleUrls = [
      candidate,
      candidate.replace(':3001', ':3000'),
      candidate.replace(':3000', ':3001'),
      'https://amplifyhd.tech',
      'http://localhost:3001',
      'http://localhost:3000',
    ];

    let connected = false;
    let lastError = '';

    for (const url of possibleUrls) {
      try {
        const response = await fetch(`${url}/api/extension/status`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          // Register extension with backend.
          await fetch(`${url}/api/extension/register`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          await chrome.storage.local.set({
            api_token: token,
            api_base: url,
            tokenExpired: false,
          });
          setConnected(true);
          showMainUI();
          await loadStats();
          await loadSettingsUI();
          connected = true;
          break;
        } else if (response.status === 401) {
          lastError = 'Token không hợp lệ';
        } else {
          lastError = `HTTP ${response.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!connected) {
      setConnected(false, lastError || 'Kết nối thất bại');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Lưu & Kết nối';
  });

  // ─── Logout (revoke + clear) ───
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    // Show button only when a token is saved.
    const updateLogoutVisibility = () => {
      chrome.storage.local.get(['api_token'], (d) => {
        logoutBtn.style.display = d.api_token ? 'inline-block' : 'none';
      });
    };
    updateLogoutVisibility();

    logoutBtn.addEventListener('click', async () => {
      if (!confirm('Đăng xuất sẽ xóa token và ngừng tự động đăng bài. Bạn có chắc?')) return;
      logoutBtn.disabled = true;
      const { api_token, api_base } = await chrome.storage.local.get(['api_token', 'api_base']);
      if (api_token) {
        try {
          await fetch(`${api_base}/api/extension/register`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${api_token}` }
          });
        } catch (e) {
          // Best-effort — server cleanup may fail but local clear still proceeds.
          console.warn('Logout: server unregister failed', e);
        }
      }
      await chrome.storage.local.clear();
      // Reset UI
      setConnected(false, 'Đã đăng xuất');
      const statsSection = document.getElementById('stats-section');
      if (statsSection) statsSection.style.display = 'none';
      logoutBtn.style.display = 'none';
      tokenInput.value = '';
      logoutBtn.disabled = false;
    });
  }

  // ─── Force scan ───
  document.getElementById('scanBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('scanBtn');
    btn.textContent = 'Đang quét...';
    chrome.runtime.sendMessage({ action: 'forceScan' }, () => {
      setTimeout(() => { btn.textContent = '🚀 Quét Ngay'; }, 1000);
    });
  });

  // ─── Background mode toggle (persisted to storage, read by background.js) ───
  const bgToggle = document.getElementById('bg-mode-toggle');
  if (bgToggle) {
    chrome.storage.local.get('backgroundMode', (d) => {
      bgToggle.checked = d.backgroundMode !== false; // default ON
    });
    bgToggle.addEventListener('change', async () => {
      await chrome.storage.local.set({ backgroundMode: bgToggle.checked });
      // Re-broadcast to background SW so the in-flight task also adopts the new mode.
      chrome.runtime.sendMessage({ action: 'setBackgroundMode', value: bgToggle.checked });
    });
  }

  // ─── Background banner: listen for processing events from SW ───
  const banner = document.getElementById('bg-banner');
  const bannerTitle = document.getElementById('bg-banner-title');
  const bannerSub = document.getElementById('bg-banner-sub');
  const bannerSwitch = document.getElementById('bg-banner-switch');

  function showBgBanner(state) {
    if (!banner) return;
    if (state && state.tabId) {
      banner.style.display = 'flex';
      const channel = state.channel || 'facebook';
      bannerTitle.textContent = `Đang đăng lên ${channel}…`;
      bannerSub.textContent = state.stage || 'Bạn có thể tiếp tục làm việc, đăng nền tự động.';
    } else {
      banner.style.display = 'none';
    }
  }

  bannerSwitch?.addEventListener('click', async () => {
    const d = await chrome.storage.local.get('amplifyProcessing');
    if (d.amplifyProcessing && d.amplifyProcessing.tabId) {
      chrome.tabs.update(d.amplifyProcessing.tabId, { active: true });
    }
  });

  // Initial load: show banner if extension already mid-post when popup opens.
  chrome.storage.local.get('amplifyProcessing', (d) => {
    if (d.amplifyProcessing) showBgBanner(d.amplifyProcessing);
  });

  // Listen for live updates from background script.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'bgPostState') {
      showBgBanner(msg.state);
    }
  });

  // ─── Pause/Resume ───
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    chrome.storage.local.get(['isPaused'], (res) => {
      if (res.isPaused) {
        pauseBtn.textContent = '▶ Tiếp tục';
        pauseBtn.style.color = '#059669';
        pauseBtn.style.borderColor = '#6ee7b7';
      }
    });

    pauseBtn.addEventListener('click', async () => {
      const res = await chrome.storage.local.get(['isPaused']);
      const newVal = !res.isPaused;
      await chrome.storage.local.set({ isPaused: newVal });

      if (newVal) {
        pauseBtn.textContent = '▶ Tiếp tục';
        pauseBtn.style.color = '#059669';
        pauseBtn.style.borderColor = '#6ee7b7';
      } else {
        pauseBtn.textContent = '⏸ Tạm dừng';
        pauseBtn.style.color = '#ef4444';
        pauseBtn.style.borderColor = '#fca5a5';
        chrome.runtime.sendMessage({ action: 'forceScan' });
      }
    });
  }

  // ─── Preview confirm/cancel ───
  const confirmPostBtn = document.getElementById('confirmPostBtn');
  const cancelPostBtn = document.getElementById('cancelPostBtn');
  if (confirmPostBtn) {
    confirmPostBtn.addEventListener('click', async () => {
      const { pendingPreview } = await chrome.storage.local.get('pendingPreview');
      if (!pendingPreview) return;
      await chrome.storage.local.remove('pendingPreview');
      chrome.runtime.sendMessage({ action: 'confirmPreview', taskId: pendingPreview.id });
    });
  }
  if (cancelPostBtn) {
    cancelPostBtn.addEventListener('click', async () => {
      const { pendingPreview } = await chrome.storage.local.get('pendingPreview');
      if (!pendingPreview) return;
      const taskId = pendingPreview.id;
      await chrome.storage.local.remove('pendingPreview');
      chrome.runtime.sendMessage({ action: 'cancelPreview', taskId });
    });
  }

  // ─── Save rate-limit / preview buttons ───
  document.getElementById('saveLimitsBtn')?.addEventListener('click', saveRateLimits);
  document.getElementById('savePreviewBtn')?.addEventListener('click', savePreviewSettings);

  // ─── Helpers ───
  function setConnected(ok, msg) {
    connDot.className = 'dot ' + (ok ? 'green' : 'red');
    connText.textContent = ok ? '✅ Đã kết nối' : (msg || '❌ Chưa kết nối');
    const tokenGroup = document.getElementById('token-input-group');
    if (tokenGroup) {
      tokenGroup.style.display = ok ? 'none' : 'block';
    }
  }

  function showMainUI() {
    statusSection.style.display = 'block';
    statsSection.style.display = 'block';
  }

  function showPreviewSection(preview) {
    const previewSection = document.getElementById('preview-section');
    if (!previewSection) return;
    const channelEl = document.getElementById('preview-channel');
    const countdownEl = document.getElementById('preview-countdown');
    const contentEl = document.getElementById('preview-content');
    const imagesEl = document.getElementById('preview-images');
    const channelNames = {
      facebook: '📘 Facebook',
      'facebook-group': '👥 Facebook Group',
      threads: '🧵 Threads',
      instagram: '📷 Instagram',
      x: '𝕏 X (Twitter)',
    };
    if (channelEl) channelEl.textContent = channelNames[preview.channel] || preview.channel;
    const remaining = Math.max(0, Math.floor((new Date(preview.countdownEndsAt || Date.now()).getTime() - Date.now()) / 1000));
    if (countdownEl) countdownEl.textContent = remaining > 0 ? `⏱️ ${remaining}s` : '⏱️ Đang xử lý...';
    if (contentEl) contentEl.textContent = preview.content || '(không có nội dung)';
    if (imagesEl) {
      imagesEl.innerHTML = '';
      (preview.images || []).slice(0, 6).forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.onerror = () => { img.style.display = 'none'; };
        imagesEl.appendChild(img);
      });
    }
    previewSection.style.display = 'block';
  }

  function hidePreviewSection() {
    const previewSection = document.getElementById('preview-section');
    if (previewSection) previewSection.style.display = 'none';
  }

  async function loadStats() {
    try {
      const d = await chrome.storage.local.get(['api_token', 'api_base']);
      if (!d.api_token) return;

      const apiBase = d.api_base || 'http://localhost:3001';
      const headers = { 'Authorization': `Bearer ${d.api_token}` };

      const res = await fetch(`${apiBase}/api/extension/status`, { headers });
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const json = await res.json();
      if (statPending) statPending.textContent = json.pending_tasks ?? 0;
      if (statCompletedToday) statCompletedToday.textContent = json.completed_today ?? 0;
      if (statCompletedTotal) statCompletedTotal.textContent = json.completed_total ?? '-';

    } catch (e) {
      console.error('Stats error:', e);
    }
  }

  // ─── Phase 3.1: Rate Limits UI ───
  const CHANNEL_LABELS = {
    facebook: '📘 Facebook (cá nhân)',
    'facebook-group': '👥 Facebook Group',
    threads: '🧵 Threads',
    instagram: '📷 Instagram',
    x: '𝕏 X (Twitter)',
  };

  function renderRateLimits(limits) {
    const container = document.getElementById('rate-limit-list');
    if (!container) return;
    container.innerHTML = '';
    Object.entries(CHANNEL_LABELS).forEach(([key, label]) => {
      const cfg = limits?.[key] || { enabled: true, perDay: 5, perHour: 2, minIntervalS: 1800 };
      const item = document.createElement('div');
      item.className = 'rate-limit-item';
      item.innerHTML = `
        <div class="rate-limit-header">
          <span class="rate-limit-channel">${label}</span>
          <label class="rate-limit-toggle">
            <input type="checkbox" data-rate-enabled="${key}" ${cfg.enabled ? 'checked' : ''}>
            <span style="font-size:11px;">Bật</span>
          </label>
        </div>
        <div class="rate-limit-fields">
          <div class="rate-limit-field">
            <label>Ngày</label>
            <input type="number" min="0" data-rate-perday="${key}" value="${cfg.perDay}">
          </div>
          <div class="rate-limit-field">
            <label>Giờ</label>
            <input type="number" min="0" data-rate-perhour="${key}" value="${cfg.perHour}">
          </div>
          <div class="rate-limit-field">
            <label>Delay (giây)</label>
            <input type="number" min="0" data-rate-interval="${key}" value="${cfg.minIntervalS}">
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function collectRateLimits() {
    const out = {};
    Object.keys(CHANNEL_LABELS).forEach(key => {
      const enabled = document.querySelector(`[data-rate-enabled="${key}"]`)?.checked || false;
      const perDay = parseInt(document.querySelector(`[data-rate-perday="${key}"]`)?.value || '0') || 0;
      const perHour = parseInt(document.querySelector(`[data-rate-perhour="${key}"]`)?.value || '0') || 0;
      const minIntervalS = parseInt(document.querySelector(`[data-rate-interval="${key}"]`)?.value || '0') || 0;
      out[key] = { enabled, perDay, perHour, minIntervalS };
    });
    return out;
  }

  // ─── Settings: load on first show ───
  // Must run AFTER CHANNEL_LABELS is declared above, otherwise renderRateLimits()
  // (called transitively from loadSettingsUI → renderRateLimits) hits TDZ on
  // the const and throws ReferenceError.
  await loadSettingsUI();

  async function saveRateLimits() {
    const btn = document.getElementById('saveLimitsBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    const limits = collectRateLimits();
    const ok = await patchSettings({ rate_limits: limits });
    btn.disabled = false;
    btn.textContent = ok ? '✅ Đã lưu' : '❌ Lỗi — thử lại';
    setTimeout(() => { btn.textContent = '💾 Lưu cài đặt'; }, 1500);
  }

  // ─── Phase 3.2: Re-post UI ───
  async function loadRecentDrafts() {
    const container = document.getElementById('recent-drafts-list');
    if (!container) return;
    container.innerHTML = '<div style="font-size:11px;color:#9ca3af;text-align:center;padding:12px;">Đang tải...</div>';
    try {
      const { api_token, api_base } = await chrome.storage.local.get(['api_token', 'api_base']);
      if (!api_token) {
        container.innerHTML = '<div style="font-size:11px;color:#9ca3af;text-align:center;padding:12px;">Chưa kết nối.</div>';
        return;
      }
      const res = await fetch(`${api_base}/api/extension/repost?limit=20`, {
        headers: { 'Authorization': `Bearer ${api_token}` },
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        container.innerHTML = '<div style="font-size:11px;color:#9ca3af;text-align:center;padding:12px;">Dữ liệu không khả dụng.</div>';
        return;
      }
      const json = await res.json();
      const drafts = json.drafts || [];
      if (drafts.length === 0) {
        container.innerHTML = '<div style="font-size:11px;color:#9ca3af;text-align:center;padding:12px;">Chưa có bài đã đăng.</div>';
        return;
      }
      container.innerHTML = '';
      drafts.forEach(d => {
        const item = document.createElement('div');
        item.className = 'repost-item';
        const when = d.published_at ? formatRelativeTime(d.published_at) : '';
        item.innerHTML = `
          <div class="repost-content">${escapeHtml(d.content || '')}</div>
          <div class="repost-meta">${when}</div>
          <div class="repost-actions">
            <button class="btn-channel-mini" data-repost="${d.id}" data-channel="facebook">📘 FB</button>
            <button class="btn-channel-mini" data-repost="${d.id}" data-channel="facebook-group">👥 Group</button>
            <button class="btn-channel-mini" data-repost="${d.id}" data-channel="threads">🧵 Threads</button>
            <button class="btn-channel-mini" data-repost="${d.id}" data-channel="instagram">📷 IG</button>
            <button class="btn-channel-mini" data-repost="${d.id}" data-channel="x">𝕏 X</button>
          </div>
        `;
        container.appendChild(item);
      });
      container.querySelectorAll('[data-repost]').forEach(b => {
        b.addEventListener('click', () => repostDraft(b.dataset.repost, b.dataset.channel));
      });
    } catch (e) {
      container.innerHTML = `<div style="font-size:11px;color:#dc2626;text-align:center;padding:12px;">Lỗi: ${e.message}</div>`;
    }
  }

  async function repostDraft(draftId, channel) {
    const { api_token, api_base } = await chrome.storage.local.get(['api_token', 'api_base']);
    if (!api_token) return;
    try {
      const res = await fetch(`${api_base}/api/extension/repost`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, channels: [channel] }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        if (contentType.includes('application/json')) {
          const err = await res.json().catch(() => ({}));
          errMsg = err.error || errMsg;
        }
        alert(`Đăng lại thất bại: ${errMsg}`);
        return;
      }
      chrome.runtime.sendMessage({ action: 'forceScan' });
      // Brief visual feedback before reload.
      const btn = document.querySelector(`[data-repost="${draftId}"][data-channel="${channel}"]`);
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '✅ Đã lên lịch';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; loadRecentDrafts(); }, 1200);
      }
    } catch (e) {
      alert(`Lỗi mạng: ${e.message}`);
    }
  }

  // ─── Phase 3.3: Preview Settings UI ───
  async function loadSettingsUI() {
    const { api_token, api_base } = await chrome.storage.local.get(['api_token', 'api_base']);
    if (!api_token) return;
    try {
      const res = await fetch(`${api_base}/api/extension/settings`, {
        headers: { 'Authorization': `Bearer ${api_token}` },
      });
      if (!res.ok) {
        console.warn('loadSettingsUI: non-ok response', res.status);
        return;
      }
      // Guard against HTML/error pages masquerading as JSON
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('loadSettingsUI: non-JSON response, skipping');
        return;
      }
      const json = await res.json();
      renderRateLimits(json.rate_limits || {});
      const toggle = document.getElementById('autoPreviewToggle');
      const delayInput = document.getElementById('previewDelayInput');
      if (toggle) toggle.checked = !!json.auto_preview;
      if (delayInput) delayInput.value = json.preview_delay_seconds ?? 10;
    } catch (e) {
      console.error('loadSettingsUI error:', e);
    }
  }

  async function savePreviewSettings() {
    const btn = document.getElementById('savePreviewBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';
    const auto_preview = document.getElementById('autoPreviewToggle')?.checked || false;
    const preview_delay_seconds = parseInt(document.getElementById('previewDelayInput')?.value || '10') || 10;
    const ok = await patchSettings({ auto_preview, preview_delay_seconds });
    await chrome.storage.local.set({ auto_preview, preview_delay_seconds });
    btn.disabled = false;
    btn.textContent = ok ? '✅ Đã lưu' : '❌ Lỗi — thử lại';
    setTimeout(() => { btn.textContent = '💾 Lưu preview'; }, 1500);
  }

  async function patchSettings(payload) {
    const { api_token, api_base } = await chrome.storage.local.get(['api_token', 'api_base']);
    if (!api_token) return false;
    try {
      const res = await fetch(`${api_base}/api/extension/settings`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Utilities ───
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatRelativeTime(iso) {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (d > 0) return `${d} ngày trước`;
      if (h > 0) return `${h} giờ trước`;
      if (m > 0) return `${m} phút trước`;
      return 'Vừa xong';
    } catch {
      return '';
    }
  }
});
