/**
 * Amplify Auto Poster - Background Service Worker
 * MV3 Service Worker — handles task queue, tab management, API communication
 */

const TASK_QUEUE_KEY = 'amplifyTaskQueue';
const PROCESSING_KEY = 'amplifyProcessing';
const GRACE_PERIOD_MS = 10_000; // 10s grace period before marking tab-close as failure

async function getApiBase() {
  const d = await chrome.storage.local.get('api_base');
  return d.api_base || 'http://localhost:3000';
}

// ─── Startup Recovery: check for orphaned tasks ───
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get([PROCESSING_KEY, 'currentProcessingPost']);
  if (stored[PROCESSING_KEY]) {
    // Extension restarted mid-task — mark as failed after grace period.
    // Preserve post data in error_message so user can identify the orphaned task.
    setTimeout(async () => {
      const current = await chrome.storage.local.get([PROCESSING_KEY, 'currentProcessingPost']);
      if (current[PROCESSING_KEY]) {
        const post = current.currentProcessingPost;
        const errMsg = 'Extension restarted during posting' + (post?.id ? ` (post_id: ${post.id})` : '');
        await updateTaskStatus(current[PROCESSING_KEY].id, 'failed', null, null, null, null, errMsg);
        await chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']);
      }
    }, GRACE_PERIOD_MS);
  }
  console.log('[Amplify] Extension installed/updated');
});

// ─── Alarm: Poll mỗi phút ───
chrome.alarms.create('amplifyPoll', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'amplifyPoll') {
    pollAndProcessTask();
  }
});

// ─── Tab Tracker with Grace Period ───
let tabCloseTimer = null;

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (!processing || processing.tabId !== tabId) return;

  // Clear any pending close timer
  if (tabCloseTimer) {
    clearTimeout(tabCloseTimer);
    tabCloseTimer = null;
  }

  // Grace period — give user time to reconnect if they accidentally closed
  tabCloseTimer = setTimeout(async () => {
    await chrome.storage.local.remove(PROCESSING_KEY);
    tabCloseTimer = null;
    await updateTaskStatus(processing.id, 'failed', null, null, null, null, 'Tab closed during posting');
    // Trigger next task
    pollAndProcessTask();
  }, GRACE_PERIOD_MS);
});

// ─── Tab load: inject automator when tab is ready ───
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (!processing || processing.tabId !== tabId) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const isSupported = [
    'facebook.com', 'threads.net', 'instagram.com', 'x.com', 'twitter.com'
  ].some(host => tab.url.includes(host));

  if (!isSupported) return;

  const scriptMap = {
    'facebook-group': 'automators/fb-group.js',
    'threads': 'automators/threads.js',
    'instagram': 'automators/instagram.js',
    'x': 'automators/x.js',
    'facebook': 'automators/fb-personal.js',
  };

  const scriptFile = scriptMap[processing.channel] || 'automators/fb-personal.js';

  try {
    // Inject shared anti-detect utilities first so automators can use them.
    // `world: 'MAIN'` is required so we can construct DataTransfer in the page's
    // own JS context. Chrome MV3 isolated worlds throw `Illegal constructor` on
    // `new DataTransfer()` in some contexts — running in the page world gives
    // access to the real constructor while still respecting the page's CSP.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['lib/anti-detect.js', scriptFile],
      world: 'MAIN',
    });
  } catch (err) {
    console.error('[Amplify] Inject failed:', err);
    await chrome.storage.local.remove(PROCESSING_KEY);
    await updateTaskStatus(processing.id, 'failed', null, null, null, null, 'Script injection failed: ' + err.message);
    pollAndProcessTask();
  }
});

// ─── Main polling ───
async function pollAndProcessTask() {
  const settings = await chrome.storage.local.get(['isPaused']);
  if (settings.isPaused) return;

  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  if (stored[PROCESSING_KEY]) return; // Task in progress

  try {
    const localData = await chrome.storage.local.get(['api_token']);
    if (!localData.api_token) return;

    const apiBase = await getApiBase();
    const response = await fetch(`${apiBase}/api/extension/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localData.api_token}`
      }
    });

    if (response.status === 401) {
      // Token expired or invalid — surface this to the popup so user can reconnect.
      await chrome.storage.local.set({
        tokenExpired: true,
        lastStatus: 'Token hết hạn. Vui lòng kết nối lại trong popup.'
      });
      return;
    }

    if (!response.ok) return;

    const json = await response.json();
    const tasks = json.tasks || [];
    if (tasks.length === 0) {
      await chrome.storage.local.remove('nextTaskTime');
      return;
    }

    const now = Date.now();
    const pending = tasks.filter(t => !t.scheduled_for || new Date(t.scheduled_for).getTime() <= now);

    if (pending.length === 0) {
      const next = tasks[0];
      await chrome.storage.local.set({ nextTaskTime: next.scheduled_for });
      return;
    }

    await processTask(pending[0]);
  } catch (error) {
    console.error('[Amplify] Poll error:', error);
  }
}

// ─── Process a single task ───
async function processTask(task) {
  // Bypass used after user clicked "Đăng ngay" in preview — don't loop back to preview.
  const bypass = await chrome.storage.local.get('_skipAutoPreviewOnce');
  if (bypass._skipAutoPreviewOnce) {
    await chrome.storage.local.remove('_skipAutoPreviewOnce');
  } else {
    // Phase 3.3: If user enabled auto_preview, hold the task in storage and open popup
    // for user confirmation. Background later receives `confirmPreview` / `cancelPreview`.
    const { auto_preview, preview_delay_seconds } = await chrome.storage.local.get([
      'auto_preview', 'preview_delay_seconds',
    ]);

    if (auto_preview) {
      const countdownS = typeof preview_delay_seconds === 'number' ? preview_delay_seconds : 10;
      const countdownEndsAt = new Date(Date.now() + countdownS * 1000).toISOString();
      await chrome.storage.local.set({
        pendingPreview: {
          id: task.id,
          channel: task.channel,
          content: task.content,
          images: task.images || [],
          countdownS,
          countdownEndsAt,
        },
      });
      try { chrome.action.openPopup(); } catch (_) { /* user can still click the icon */ }
      return;
    }
  }

  // Guard: facebook-group needs target_id; without it we would silently post
  // to the user's personal wall instead of the intended group.
  if (task.channel === 'facebook-group' && !task.target_id) {
    console.error('[Amplify] facebook-group task missing target_id', task.id);
    await updateTaskStatus(
      task.id, 'failed', null, null, null, null,
      'Thiếu target_id cho Facebook group. Vui lòng chọn group trước khi đăng.'
    );
    pollAndProcessTask();
    return;
  }

  const platformUrls = {
    'facebook': 'https://www.facebook.com',
    'facebook-group': `https://www.facebook.com/groups/${task.target_id}`,
    'threads': 'https://www.threads.net',
    'instagram': 'https://www.instagram.com',
    'x': 'https://x.com/compose/post',
  };

  const url = platformUrls[task.channel] || 'https://www.facebook.com';

  const tab = await chrome.tabs.create({ url, active: true });

  // Keep both keys in sync: PROCESSING_KEY for background, currentProcessingPost for automators.
  await chrome.storage.local.set({
    [PROCESSING_KEY]: { id: task.id, channel: task.channel, tabId: tab.id, retryCount: 0 },
    currentProcessingPost: {
      id: task.id,
      content: task.content,
      channel: task.channel,
      target_id: task.target_id,
      target_type: task.target_type,
      images: task.images || []
    }
  });

  console.log(`[Amplify] Processing task ${task.id} on ${task.channel} in tab ${tab.id}`);
}

// ─── Phase 3.3: Continue a pending preview after user confirmed ───
async function continueAfterPreview(taskId) {
  const apiBase = await getApiBase();
  const headers = { 'Content-Type': 'application/json' };
  const local = await chrome.storage.local.get(['api_token']);
  if (!local.api_token) return;
  headers['Authorization'] = `Bearer ${local.api_token}`;

  // Mark the task 'processing' so other poll cycles don't double-pick it.
  try {
    await fetch(`${apiBase}/api/extension/tasks/${taskId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'processing' }),
    });
  } catch (e) { console.error('[Amplify] mark processing failed:', e); }

  // Re-fetch full task row so we have the same payload we would have processed otherwise.
  const res = await fetch(`${apiBase}/api/extension/tasks?limit=10`, { headers });
  if (!res.ok) return;
  const { tasks = [] } = await res.json();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Skip the auto_preview check this time by setting a one-shot bypass flag.
  await chrome.storage.local.set({ _skipAutoPreviewOnce: true });
  await processTask(task);
}

// ─── Phase 3.3: Cancel a pending preview via API ───
async function cancelPreview(taskId) {
  const local = await chrome.storage.local.get(['api_token', 'api_base']);
  if (!local.api_token) return;
  try {
    await fetch(`${local.api_base}/api/extension/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${local.api_token}`,
      },
      body: JSON.stringify({ task_id: taskId, reason: 'Cancelled from preview' }),
    });
  } catch (e) { console.error('[Amplify] cancel preview failed:', e); }
  // Pick the next task immediately if any.
  pollAndProcessTask();
}

// ─── Retry logic ───
async function retryTask(taskId) {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (!processing || processing.id !== taskId) return;

  if ((processing.retryCount || 0) >= 2) {
    await chrome.storage.local.remove(PROCESSING_KEY);
    await updateTaskStatus(taskId, 'failed', null, null, null, null, 'Max retries exceeded');
    pollAndProcessTask();
    return;
  }

  const retryCount = (processing.retryCount || 0) + 1;
  const delay = Math.pow(2, retryCount) * 1000; // exponential backoff: 2s, 4s

  console.log(`[Amplify] Retrying task ${taskId} in ${delay}ms (attempt ${retryCount})`);

  await chrome.storage.local.set({
    [PROCESSING_KEY]: { ...processing, retryCount }
  });

  setTimeout(() => pollAndProcessTask(), delay);
}

// ─── Message handler from automators ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'postCompleted') {
    chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']);
    updateTaskStatus(message.postId, 'completed', message.resultUrl, message.actorUrl, message.actorName, message.targetName)
      .then(() => pollAndProcessTask());
    sendResponse({ ok: true });

  } else if (message.action === 'postFailed') {
    chrome.storage.local.remove('currentProcessingPost');
    handlePostFailed(message).catch(err => console.error('[Amplify] handlePostFailed error:', err));
    sendResponse({ ok: true });

  } else if (message.action === 'fetchImage') {
    fetch(message.url)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, dataUrl: reader.result, type: blob.type });
        reader.onerror = () => sendResponse({ success: false, error: 'FileReader error' });
        reader.readAsDataURL(blob);
      })
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true; // async response

  } else if (message.action === 'fetchMediaByUploadId') {
    // Resolves an internal uploadId (e.g. "upl_xxx_yyy") against the server's
    // in-memory media store. Authentication uses the same Bearer API token the
    // extension uses for /api/extension/tasks. Returns the same {dataUrl, type}
    // shape as fetchImage so the calling automator doesn't have to branch.
    (async () => {
      try {
        const apiBase = await getApiBase();
        const local = await chrome.storage.local.get(['api_token']);
        if (!local.api_token) {
          sendResponse({ success: false, error: 'No API token' });
          return;
        }
        const res = await fetch(`${apiBase}/api/media/${message.uploadId}`, {
          headers: { 'Authorization': `Bearer ${local.api_token}` },
        });
        if (!res.ok) {
          sendResponse({ success: false, error: `Media fetch failed (${res.status})` });
          return;
        }
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, dataUrl: reader.result, type: blob.type });
        reader.onerror = () => sendResponse({ success: false, error: 'FileReader error' });
        reader.readAsDataURL(blob);
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true; // async response

  } else if (message.action === 'forceScan') {
    chrome.storage.local.remove(PROCESSING_KEY).then(() => pollAndProcessTask());
    sendResponse({ success: true });

  } else if (message.action === 'confirmPreview') {
    // User clicked "Đăng ngay" — clear preview state and continue processing this task.
    chrome.storage.local.remove('pendingPreview').then(() => continueAfterPreview(message.taskId));
    sendResponse({ success: true });

  } else if (message.action === 'cancelPreview') {
    // User clicked "Hủy" — mark task cancelled via API.
    chrome.storage.local.remove('pendingPreview').then(() => cancelPreview(message.taskId));
    sendResponse({ success: true });

  } else if (message.action === 'log') {
    chrome.storage.local.set({ lastStatus: message.msg });
  }
});

// ─── Handle postFailed with proper await (avoid Promise race) ───
async function handlePostFailed(message) {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (processing && processing.retryCount < 2) {
    // Retry transient failures
    retryTask(processing.id);
  } else {
    await chrome.storage.local.remove(PROCESSING_KEY);
    await updateTaskStatus(message.postId, 'failed', null, null, null, null, message.error || 'Unknown error');
    pollAndProcessTask();
  }
}

// ─── Update task status on backend ───
async function updateTaskStatus(taskId, status, resultUrl, actorUrl, actorName, targetName, errorMsg) {
  try {
    const localData = await chrome.storage.local.get(['api_token']);
    if (!localData.api_token) return;

    const apiBase = await getApiBase();
    const body = { status, task_id: taskId };
    if (resultUrl) body.result_url = resultUrl;
    if (actorUrl) body.actor_url = actorUrl;
    if (actorName) body.actor_name = actorName;
    if (targetName) body.target_name = targetName;
    if (errorMsg) body.error_message = errorMsg;

    await fetch(`${apiBase}/api/extension/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localData.api_token}`
      },
      body: JSON.stringify(body)
    });

    console.log(`[Amplify] Task ${taskId} → ${status}`);
  } catch (e) {
    console.error('[Amplify] updateTaskStatus error:', e);
  }
}
