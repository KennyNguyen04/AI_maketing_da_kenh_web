import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { analyzeBrandVaultText, analyzeBrandVaultUrl, repurposeContent } from '@/lib/inngest'
import { processScheduledPosts, triggerScheduler } from '@/lib/inngest/scheduler.worker'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeBrandVaultText,
    analyzeBrandVaultUrl,
    repurposeContent,
    processScheduledPosts,
    triggerScheduler,
  ],
})
