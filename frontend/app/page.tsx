import type { Metadata } from 'next'
import { Nav } from '@/components/marketing/Nav'
import { Hero } from '@/components/marketing/Hero'
import { PainPoints } from '@/components/marketing/PainPoints'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Features } from '@/components/marketing/Features'
import { Stats } from '@/components/marketing/Stats'
import { CTABanner } from '@/components/marketing/CTABanner'
import { Footer } from '@/components/marketing/Footer'

export const metadata: Metadata = {
  title: 'Amplify - Repurpose once. Publish everywhere.',
  description:
    'Amplify turns one article into platform-ready drafts for LinkedIn, Facebook, X, and Threads. Brand Vault keeps your tone consistent. Approval-first workflow.',
  openGraph: {
    title: 'Amplify - Repurpose once. Publish everywhere.',
    description:
      'Turn one article into platform-ready drafts. Approval-first workflow with a Chrome Extension for auto-posting.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <main className="bg-app-bg">
      <Nav />
      <Hero />
      <PainPoints />
      <HowItWorks />
      <Features />
      <Stats />
      <CTABanner />
      <Footer />
    </main>
  )
}