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

/**
 * Push the current posting state to any open popup so the non-blocking
 * background banner can show progress without the user having to click.
 *
 * IMPORTANT: chrome.runtime.sendMessage throws synchronously when no
 * receiver is listening (popup closed, no other extension page open).
 * If you `await` it, that throw becomes an uncaught promise rejection
 * and Chrome logs `Receiving end does not exist`. We use the
 * callback-style API with a no-op callback so any throw is silenced
 * before it can become an unhandled rejection.
 */
function broadcastPostState() {
  chrome.storage.local.get(PROCESSING_KEY, (d) => {
    try {
      chrome.runtime.sendMessage(
        { action: 'bgPostState', state: (d && d[PROCESSING_KEY]) || null },
        () => {
          // Swallow "Receiving end does not exist" when no popup is open.
          // Reading lastError tells Chrome we handled it; otherwise Chrome
          // logs an error for every send.
          if (chrome.runtime.lastError) { /* expected: popup closed */ }
        }
      );
    } catch (_) { /* never let broadcast kill the worker */ }
  });
}

/**
 * Update only the human-readable stage label on the processing record.
 * Called by content scripts as they progress through the post flow.
 */
function setProcessingStage(stage) {
  chrome.storage.local.get(PROCESSING_KEY, (d) => {
    const cur = d && d[PROCESSING_KEY];
    if (!cur) return;
    cur.stage = stage;
    chrome.storage.local.set({ [PROCESSING_KEY]: cur }, () => broadcastPostState());
  });
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

// ─── Alarm: Poll every 30s for new tasks. MV3 service workers are
//     throttled aggressively; the 30s minimum is the lowest the API
//     accepts and keeps queue lag below what users perceive. ───
chrome.alarms.create('amplifyPoll', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'amplifyPoll') {
    pollAndProcessTask();
  }
});

// ─── Tab Tracker with Grace Period ───
// If the post tab closes mid-post, we keep the processing record for a
// short grace period so the user (or a service-worker restart) can
// re-attach. After the grace, we mark the task failed and move on.
let tabCloseTimer = null;
const TAB_CLOSE_GRACE_MS = 6_000; // shorter than the old 10s so we fail-fast

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (!processing || processing.tabId !== tabId) return;

  if (tabCloseTimer) {
    clearTimeout(tabCloseTimer);
    tabCloseTimer = null;
  }

  tabCloseTimer = setTimeout(async () => {
    tabCloseTimer = null;
    if (processTask._watchdog) { clearTimeout(processTask._watchdog); processTask._watchdog = null; }
    await chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']);
    broadcastPostState();
    await updateTaskStatus(processing.id, 'failed', null, null, null, null, 'Tab đăng bài bị đóng giữa chừng');
    pollAndProcessTask();
  }, TAB_CLOSE_GRACE_MS);
});

// ─── Tab load: inject automator when tab starts loading ───
//
// We inject at `status === 'loading'` (DOMContentLoaded equivalent) instead
// of waiting for `status === 'complete'`. The Facebook home feed takes
// 5-10s to fully load; the create-post card lives in the first ~500ms of
// DOMContentLoaded. Injecting at loading lets the automator race the lazy
// loaders rather than waiting behind them.
//
// IMPORTANT: anti-detect + automator must run in ISOLATED world so they
// retain access to chrome.* APIs (storage, runtime.sendMessage) that the
// automator relies on for fetchImage and task completion. DataTransfer /
// ClipboardEvent / execCommand also work in ISOLATED.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  const processing = stored[PROCESSING_KEY];

  if (!processing || processing.tabId !== tabId) return;
  if (changeInfo.status !== 'loading') return;
  if (!tab.url) return;

  const isSupported = [
    'facebook.com', 'threads.net', 'instagram.com', 'x.com', 'twitter.com'
  ].some(host => tab.url.includes(host));

  if (!isSupported) return;

  // Avoid double-injection if the tab navigates (e.g. login redirect).
  if (processing.injected) {
    return;
  }

  const scriptMap = {
    'facebook-group': 'automators/fb-group.js',
    'threads': 'automators/threads.js',
    'instagram': 'automators/instagram.js',
    'x': 'automators/x.js',
    'facebook': 'automators/fb-personal.js',
  };

  const scriptFile = scriptMap[processing.channel] || 'automators/fb-personal.js';

  try {
    // Inject anti-detect + debugger-driver + automator into ISOLATED world.
    // - anti-detect.js: pre-patches page APIs (CDP detection evasion).
    // - debugger-driver.js: chrome.debugger wrapper that lets the automator
    //   send real keyboard events to the tab. Used by fb-personal.js to
    //   trigger the "press P to compose" shortcut — DOM KeyboardEvents
    //   don't reach FB's shortcut handler.
    // - <scriptFile>: per-channel automator.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['lib/anti-detect.js', 'lib/debugger-driver.js', scriptFile],
    });
    processing.injected = true;
    await chrome.storage.local.set({ [PROCESSING_KEY]: processing });
  } catch (err) {
    console.error('[Amplify] Inject failed:', err);
    if (processTask._watchdog) { clearTimeout(processTask._watchdog); processTask._watchdog = null; }
    await chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']);
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
    // Tasks marked urgent (priority >= 100) bypass the scheduled_for wait.
    // The webapp's "Đăng ngay qua Extension" sets scheduled_for = now+60s
    // (because /api/schedule rejects past dates) but priority=100 to signal
    // "user wants this NOW". Without this bypass users waited 60-90s for
    // the buffer to elapse before the first poll cycle would pick the
    // task up — totaling 2-3 minutes from click to composer modal.
    const pending = tasks.filter(t => {
      const scheduledAt = t.scheduled_for ? new Date(t.scheduled_for).getTime() : 0;
      const isUrgent = (t.priority || 0) >= 100;
      return isUrgent || !scheduledAt || scheduledAt <= now;
    });

    if (pending.length === 0) {
      const next = tasks[0];
      await chrome.storage.local.set({ nextTaskTime: next.scheduled_for });
      return;
    }

    // Sort: urgent first (highest priority), then earliest scheduled_for.
    pending.sort((a, b) => {
      const pa = (a.priority || 0);
      const pb = (b.priority || 0);
      if (pa !== pb) return pb - pa;
      const sa = a.scheduled_for ? new Date(a.scheduled_for).getTime() : 0;
      const sb = b.scheduled_for ? new Date(b.scheduled_for).getTime() : 0;
      return sa - sb;
    });

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
    // Facebook does not expose a stable /compose/post URL for personal feed;
    // we open the home page and click the "Tạo bài viết" card to open the
    // modal composer.
    'facebook': 'https://www.facebook.com/',
    'facebook-group': `https://www.facebook.com/groups/${task.target_id}`,
    'threads': 'https://www.threads.net',
    'instagram': 'https://www.instagram.com',
    'x': 'https://x.com/compose/post',
  };

  const url = platformUrls[task.channel] || 'https://www.facebook.com/';

  // Decide foreground vs background. Default = background (don't steal focus).
  // User can toggle off via the popup switch — that flag is in storage.
  const stored = await chrome.storage.local.get('backgroundMode');
  const runInBackground = stored.backgroundMode !== false && task.background !== false;
  const tab = await chrome.tabs.create({ url, active: !runInBackground });

  // Keep both keys in sync: PROCESSING_KEY for background, currentProcessingPost for automators.
  await chrome.storage.local.set({
    [PROCESSING_KEY]: {
      id: task.id, channel: task.channel, tabId: tab.id, retryCount: 0,
      stage: 'Đang mở trang đăng…', background: runInBackground,
      startedAt: Date.now()
    },
    currentProcessingPost: {
      id: task.id,
      content: task.content,
      channel: task.channel,
      target_id: task.target_id,
      target_type: task.target_type,
      images: task.images || []
    }
  });

  // Notify popup (if open) that we're posting in the background.
  broadcastPostState();

  // Watchdog: if the automator doesn't finish within 90s, fail the task
  // so the queue keeps moving. Common cause: Lexical editor never accepted
  // text and the automator is stuck in its find-editor loop.
  if (processTask._watchdog) clearTimeout(processTask._watchdog);
  processTask._watchdog = setTimeout(async () => {
    const cur = await chrome.storage.local.get(PROCESSING_KEY);
    if (cur[PROCESSING_KEY] && cur[PROCESSING_KEY].id === task.id) {
      console.warn(`[Amplify] Watchdog: task ${task.id} stuck >90s, marking failed.`);
      await chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']);
      broadcastPostState();
      await updateTaskStatus(
        task.id, 'failed', null, null, null, null,
        'Timeout: automator không hoàn thành trong 90s (thường do editor không nhận text).'
      );
      pollAndProcessTask();
    }
  }, 90_000);

  console.log(`[Amplify] Processing task ${task.id} on ${task.channel} in tab ${tab.id} (background=${runInBackground})`);
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
    if (processTask._watchdog) { clearTimeout(processTask._watchdog); processTask._watchdog = null; }
    chrome.storage.local.remove([PROCESSING_KEY, 'currentProcessingPost']).then(async () => {
      broadcastPostState();
      await updateTaskStatus(message.postId, 'completed', message.resultUrl, message.actorUrl, message.actorName, message.targetName);
      await pollAndProcessTask();
    });
    sendResponse({ ok: true });

  } else if (message.action === 'postFailed') {
    if (!message.willRetry && processTask._watchdog) { clearTimeout(processTask._watchdog); processTask._watchdog = null; }
    // P0-4 hardening: wrap the async fire-and-forget chain in try/catch.
    // The .then() callback runs detached from the message channel — without
    // a catch, an unhandled rejection would silently kill retry logic and
    // the next poll cycle would see the task stuck in 'processing' forever.
    chrome.storage.local.remove('currentProcessingPost').then(async () => {
      try {
        await handlePostFailed(message);
        if (!message.willRetry) {
          await chrome.storage.local.remove(PROCESSING_KEY);
          broadcastPostState();
        }
      } catch (e) {
        console.error('[Amplify] postFailed handler crashed:', e);
        // Best-effort cleanup so the queue keeps moving even if handlePostFailed throws.
        if (!message.willRetry) {
          try { await chrome.storage.local.remove(PROCESSING_KEY); } catch (_) {}
          broadcastPostState();
        }
      }
    });
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
    // MUT-style resync: reset any tasks whose worker died (status=processing
    // older than 5 minutes) back to pending BEFORE we poll. Without this, a
    // stale processing task would block the queue forever — the next poll
    // sees it as "already claimed" and skips it.
    (async () => {
      try {
        const local = await chrome.storage.local.get(['api_token', 'api_base']);
        if (local.api_token && local.api_base) {
          try {
            const res = await fetch(`${local.api_base}/api/extension/resync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${local.api_token}`,
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.reset_count > 0) {
                console.log(`[Amplify] Resync: reset ${data.reset_count} stale processing task(s) → pending`);
                // Surface to popup so user sees "🔄 Reset N task kẹt" within 30s.
                await chrome.storage.local.set({
                  lastResync: { at: Date.now(), resetCount: data.reset_count },
                });
              }
            }
          } catch (e) {
            // Best-effort: resync failure shouldn't block the manual scan.
            console.warn('[Amplify] resync call failed:', e.message);
          }
        }
        await chrome.storage.local.remove(PROCESSING_KEY);
        await pollAndProcessTask();
      } catch (e) {
        console.error('[Amplify] forceScan error:', e);
      }
      sendResponse({ success: true });
    })();
    return true; // keep channel open for async sendResponse

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
  } else if (message.action === 'setBackgroundMode') {
    chrome.storage.local.set({ backgroundMode: !!message.value }).then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async sendResponse
  } else if (message.action === 'getBackgroundState') {
    chrome.storage.local.get(PROCESSING_KEY).then((d) => {
      sendResponse({ state: d[PROCESSING_KEY] || null });
    });
    return true;
  } else if (message.action === 'bgPostStage' && sender.tab) {
    // Content script reporting progress — update stage label and re-broadcast.
    chrome.storage.local.get(PROCESSING_KEY, (d) => {
      const cur = d && d[PROCESSING_KEY];
      if (!cur || cur.tabId !== sender.tab.id) return;
      cur.stage = message.stage || cur.stage;
      chrome.storage.local.set({ [PROCESSING_KEY]: cur }, () => {
        // broadcastPostState uses callback-style sendMessage to avoid
        // "Receiving end does not exist" when no popup is open.
        broadcastPostState();
      });
    });

  } else if (message.action === 'navigateTab' && sender.tab) {
    // Navigate the calling tab to a new URL. Used as a fallback for
    // when the FB home feed refuses to open the composer via any click
    // path — `/composer/` is the same destination that clicking
    // "Tạo bài viết" would have routed to, just initiated directly.
    const url = message.url;
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      sendResponse({ ok: false, error: 'Invalid URL' });
      return;
    }
    chrome.tabs.update(sender.tab.id, { url }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });
    return true;

  } else if (message.scope === 'debugger' && sender.tab) {
    // RPC from content-side lib/debugger-driver.js. We can only attach to
    // the tab the content script lives in. The service worker holds the
    // chrome.debugger session for the lifetime of one withDebugger() call.
    handleDebuggerRpc(message.action, message, sender.tab.id, sendResponse);
    return true; // keep channel open
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

// ─── Debugger RPC ──────────────────────────────────────────────────────
// chrome.debugger is only available in the service worker. The content
// script calls into here via runtime.sendMessage with scope='debugger'.
// One attach() per withDebugger() envelope; detach is best-effort.
//
// Track which tab each withDebugger() call is attached to so multiple
// concurrent calls (shouldn't happen, but defensive) don't fight over the
// same debuggee.
const DEBUGGER_TARGETS = new Set(); // tabIds currently attached

async function handleDebuggerRpc(action, message, tabId, sendResponse) {
  try {
    if (action === 'attach') {
      if (DEBUGGER_TARGETS.has(tabId)) {
        // Already attached by a previous call in this SW lifetime — reuse.
        sendResponse({ ok: true, result: { reused: true } });
        return;
      }
      await attachDebugger(tabId);
      DEBUGGER_TARGETS.add(tabId);
      sendResponse({ ok: true, result: { attached: true } });
      return;
    }
    if (action === 'detach') {
      if (DEBUGGER_TARGETS.has(tabId)) {
        try { await detachDebugger(tabId); } catch (_) {/* swallow */}
        DEBUGGER_TARGETS.delete(tabId);
      }
      sendResponse({ ok: true, result: { detached: true } });
      return;
    }
    if (action === 'pressKey') {
      const desc = message.desc || {};
      await dispatchKey(tabId, desc);
      sendResponse({ ok: true, result: { sent: true } });
      return;
    }
    if (action === 'insertText') {
      await sendDebugger(tabId, 'Input.insertText', { text: message.text || '' });
      sendResponse({ ok: true, result: { sent: true } });
      return;
    }
    if (action === 'mouseClick') {
      // Emulate the exact sequence a real mouse produces:
      //   1. mouseMoved (so the page's mousemove handlers fire and the
      //      element gets :hover/:focus-within styles, which FB's React
      //      onPointerEnter needs to attach pointer listeners)
      //   2. mousePressed with pointerType='mouse' (gives isPrimary=true
      //      and pointerType='mouse', which FB's anti-bot checks)
      //   3. mouseReleased (closes the gesture, fires the click event)
      const { x, y, button = 'left', clickCount = 1 } = message;
      await sendDebugger(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseMoved', x, y, button, buttons: 0,
      });
      await sendDebugger(tabId, 'Input.dispatchMouseEvent', {
        type: 'mousePressed', x, y, button, clickCount, buttons: 1,
        pointerType: 'mouse',
      });
      await sendDebugger(tabId, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased', x, y, button, clickCount, buttons: 0,
        pointerType: 'mouse',
      });
      sendResponse({ ok: true, result: { sent: true } });
      return;
    }
    sendResponse({ ok: false, error: 'Unknown debugger action: ' + action });
  } catch (e) {
    sendResponse({ ok: false, error: e.message || String(e) });
  }
}

function attachDebugger(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'attach failed'));
      } else {
        resolve();
      }
    });
  });
}

function detachDebugger(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      if (chrome.runtime.lastError) {/* expected when not attached */}
      resolve();
    });
  });
}

function sendDebugger(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params || {}, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || 'sendCommand failed'));
      } else {
        resolve(result);
      }
    });
  });
}

async function dispatchKey(tabId, desc) {
  const modifiers = desc.shift ? 8 : 0; // 8 = Shift in CDP modifier bitmask
  // rawKeyDown: triggers FB's "press P to compose" shortcut handler.
  await sendDebugger(tabId, 'Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: desc.key,
    code: desc.code,
    windowsVirtualKeyCode: desc.vk,
    nativeVirtualKeyCode: desc.vk,
    modifiers,
  });
  if (desc.text !== undefined && desc.text !== '') {
    await sendDebugger(tabId, 'Input.dispatchKeyEvent', {
      type: 'char',
      key: desc.key,
      code: desc.code,
      text: desc.text,
      unmodifiedText: desc.text,
      modifiers,
    });
  }
  await sendDebugger(tabId, 'Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: desc.key,
    code: desc.code,
    windowsVirtualKeyCode: desc.vk,
    nativeVirtualKeyCode: desc.vk,
    modifiers,
  });
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
