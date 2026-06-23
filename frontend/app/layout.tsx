import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'

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
  title: 'Amplify - Repurpose once. Publish everywhere.',
  description:
    'AI-powered content repurposing platform for Vietnamese solo founders.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${lora.variable} bg-pure-canvas text-midnight-ink`}>{children}</body>
    </html>
  )
}
