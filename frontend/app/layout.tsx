import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-lora',
  weight: ['400'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Amplify - Repurpose once. Publish everywhere.',
    template: '%s | Amplify',
  },
  description: 'AI-powered content repurposing platform for Vietnamese solo founders.',
  applicationName: 'Amplify',
  themeColor: '#1d4ed8',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Amplify',
    title: 'Amplify - Repurpose once. Publish everywhere.',
    description: 'AI-powered content repurposing platform for Vietnamese solo founders.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amplify - Repurpose once. Publish everywhere.',
    description: 'AI-powered content repurposing platform for Vietnamese solo founders.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${lora.variable} bg-pure-canvas text-midnight-ink`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
