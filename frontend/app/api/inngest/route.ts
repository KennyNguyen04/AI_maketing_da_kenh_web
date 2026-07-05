import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { analyzeBrandVaultText, analyzeBrandVaultUrl, repurposeContent } from '@/lib/inngest'
// processScheduledPosts + triggerScheduler are imported here only so the
// module keeps type-checking when uncommented. They are NOT registered with
// Inngest — Amplify no longer auto-posts via X/Facebook APIs. The Extension
// polls extension_tasks directly via chrome.alarms.
import { processScheduledPosts, triggerScheduler } from '@/lib/inngest/scheduler.worker'
void processScheduledPosts
void triggerScheduler

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeBrandVaultText,
    analyzeBrandVaultUrl,
    repurposeContent,
    // processScheduledPosts,  // disabled — direct API publish disabled
    // triggerScheduler,      // disabled — direct API publish disabled
  ],
})
