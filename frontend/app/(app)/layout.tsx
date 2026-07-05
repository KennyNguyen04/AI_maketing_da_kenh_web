'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AppLayout>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  )
}
