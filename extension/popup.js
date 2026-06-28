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

  // ─── Poll for live status updates ───
  setInterval(async () => {
    const d = await chrome.storage.local.get([
      'currentProcessingPost', 'lastStatus', 'nextTaskTime', 'outOfCredits', 'isPaused'
    ]);

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

    // Try multiple possible API endpoints
    const possibleUrls = [
      apiBase,
      apiBase.replace(':3001', ':3000'),
      apiBase.replace(':3000', ':3001'),
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
          const result = await response.json();
          
          // Register extension with backend
          await fetch(`${url}/api/extension/register`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          await chrome.storage.local.set({ api_token: token, api_base: url });
          setConnected(true);
          showMainUI();
          await loadStats();
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

  async function loadStats() {
    try {
      const d = await chrome.storage.local.get(['api_token', 'api_base']);
      if (!d.api_token) return;

      const apiBase = d.api_base || 'http://localhost:3001';
      const headers = { 'Authorization': `Bearer ${d.api_token}` };

      // Fetch stats from dedicated /status endpoint
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
});
