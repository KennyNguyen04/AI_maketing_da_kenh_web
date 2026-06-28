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
  const stored = await chrome.storage.local.get(PROCESSING_KEY);
  if (stored[PROCESSING_KEY]) {
    // Extension restarted mid-task — mark as failed after grace period
    setTimeout(async () => {
      const current = await chrome.storage.local.get(PROCESSING_KEY);
      if (current[PROCESSING_KEY]) {
        await updateTaskStatus(current[PROCESSING_KEY].id, 'failed', null, null, null, null, 'Extension restarted during posting');
        await chrome.storage.local.remove(PROCESSING_KEY);
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
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['lib/anti-detect.js', scriptFile]
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
        'Authorization': `Bearer ${sessionData.api_token}`
      }
    });

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
  const platformUrls = {
    'facebook': 'https://www.facebook.com',
    'facebook-group': task.target_id ? `https://www.facebook.com/groups/${task.target_id}` : 'https://www.facebook.com',
    'threads': 'https://www.threads.net',
    'instagram': 'https://www.instagram.com',
    'x': 'https://x.com/compose/post',
  };

  const url = platformUrls[task.channel] || 'https://www.facebook.com';

  const tab = await chrome.tabs.create({ url, active: true });

  await chrome.storage.local.set({
    [PROCESSING_KEY]: { id: task.id, channel: task.channel, tabId: tab.id, retryCount: 0 }
  });

  console.log(`[Amplify] Processing task ${task.id} on ${task.channel} in tab ${tab.id}`);
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
    chrome.storage.local.remove(PROCESSING_KEY);
    updateTaskStatus(message.postId, 'completed', message.resultUrl, message.actorUrl, message.actorName, message.targetName)
      .then(() => pollAndProcessTask());
    sendResponse({ ok: true });

  } else if (message.action === 'postFailed') {
    const stored = chrome.storage.local.get(PROCESSING_KEY);
    stored.then(s => {
      const processing = s[PROCESSING_KEY];
      if (processing && processing.retryCount < 2) {
        // Retry transient failures
        retryTask(processing.id);
      } else {
        chrome.storage.local.remove(PROCESSING_KEY);
        updateTaskStatus(message.postId, 'failed', null, null, null, null, message.error || 'Unknown error')
          .then(() => pollAndProcessTask());
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

  } else if (message.action === 'forceScan') {
    chrome.storage.local.remove(PROCESSING_KEY).then(() => pollAndProcessTask());
    sendResponse({ success: true });

  } else if (message.action === 'log') {
    chrome.storage.local.set({ lastStatus: message.msg });
  }
});

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
        'Authorization': `Bearer ${sessionData.api_token}`
      },
      body: JSON.stringify(body)
    });

    console.log(`[Amplify] Task ${taskId} → ${status}`);
  } catch (e) {
    console.error('[Amplify] updateTaskStatus error:', e);
  }
}
