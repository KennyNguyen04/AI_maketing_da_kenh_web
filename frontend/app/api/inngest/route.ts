import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { analyzeBrandVaultText, analyzeBrandVaultUrl, repurposeContent } from '@/lib/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeBrandVaultText,
    analyzeBrandVaultUrl,
    repurposeContent,
  ],
})
