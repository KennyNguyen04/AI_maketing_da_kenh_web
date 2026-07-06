import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { analyzeBrandVaultText, analyzeBrandVaultUrl, repurposeContent } from '@/lib/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeBrandVaultText,
    analyzeBrandVaultUrl,
    repurposeContent,
    // Scheduler functions (processScheduledPosts, triggerScheduler) were removed from
    // registration because Amplify now uses the Chrome Extension for auto-posting,
    // not direct API publishing. The worker code in lib/inngest/scheduler.worker.ts
    // is kept for reference but is NOT wired to Inngest at runtime.
    //
    // If you re-enable direct API publishing, re-import + re-add them here:
    // import { processScheduledPosts, triggerScheduler } from '@/lib/inngest/scheduler.worker'
    // ...processScheduledPosts, triggerScheduler...
  ],
})
