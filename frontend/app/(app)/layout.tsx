import { AppLayout } from '@/components/layout/AppLayout'
import { PageTransition } from './PageTransition'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <PageTransition>{children}</PageTransition>
    </AppLayout>
  )
}