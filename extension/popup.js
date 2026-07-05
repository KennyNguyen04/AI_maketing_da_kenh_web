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

  // ─── Poll for live status updates + pendingPreview ───
  setInterval(async () => {
    const d = await chrome.storage.local.get([
      'currentProcessingPost', 'lastStatus', 'nextTaskTime', 'outOfCredits',
      'isPaused', 'pendingPreview', 'tokenExpired'
    ]);

    // Token expired — show reconnect banner.
    if (d.tokenExpired) {
      statusIcon.textContent = '🔑';
      statusTitle.textContent = 'Token hết hạn';
      statusTitle.style.color = '#dc2626';
      statusDetail.textContent = d.lastStatus || 'Vui lòng kết nối lại.';
      statusDetail.style.color = '#dc2626';
      setConnected(false, '❌ Token hết hạn');
      return;
    }

    // Pending preview takes priority over normal status.
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
      if (document.getElementById('pauseBtn')) document.getElementById('pauseBtn').style.display = 'none';
      return;
    }

    if (document.getElementById('pauseBtn')) document.getElementById('pauseBtn').style.display = '';
    if (document.getElementById('scanBtn')) document.getElementById('scanBtn').style.display = '';

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
    } else {
      if (d.isPaused) {
        statusIcon.textContent = '⏸';
        statusTitle.textContent = 'Hệ thống tạm dừng';
        statusTitle.style.color = '#ef4444';
        statusDetail.textContent = 'Bấm Tiếp tục để quét bài lại.';
        statusDetail.style.color = '#dc2626';
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
      } else {
        statusIcon.textContent = '⏸';
        statusTitle.textContent = `Chưa có lịch đăng`;
        statusTitle.style.color = '#6b7280';
        statusDetail.textContent = 'Sẽ quét lại tự động sau ~1 phút.';
        statusDetail.style.color = '#9ca3af';
      }
    }
  }, 1000);

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
    const possibleUrls = [
      apiBase,
      apiBase.replace(':3001', ':3000'),
      apiBase.replace(':3000', ':3001'),
      'https://amplify-eight-drab.vercel.app',
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

  // ─── Force scan ───
  document.getElementById('scanBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('scanBtn');
    btn.textContent = 'Đang quét...';
    chrome.runtime.sendMessage({ action: 'forceScan' }, () => {
      setTimeout(() => { btn.textContent = '🚀 Quét Ngay'; }, 1000);
    });
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

  // ─── Settings: load on first show ───
  await loadSettingsUI();

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
      const res = await fetch(`${api_base}/api/extension/recent-drafts?limit=20`, {
        headers: { 'Authorization': `Bearer ${api_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Đăng lại thất bại: ${err.error || res.status}`);
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
      if (!res.ok) return;
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
