'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui/Toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu không đúng / Invalid credentials'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="w-[480px] p-12 shadow-lg">
        <h1 className="text-center text-[32px] text-midnight-ink">Amplify</h1>
        <p className="mt-3 text-center text-dark-charcoal">Chào mừng trở lại! / Welcome back!</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error ? (
            <div className="rounded-card bg-sunset-orange/10 px-4 py-3 text-sm text-vibrant-orange">
              {error}
            </div>
          ) : null}
          <Input label="Email" type="email" placeholder="ban@example.com" value={email} onChange={setEmail} required />
          <Input label="Mật khẩu / Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} required />
          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                setToastMessage('Vui lòng liên hệ với Quản trị viên để đặt lại mật khẩu / Please contact Admin to reset your password.')
                setToastType('info')
                setToastVisible(true)
              }}
              className="text-sm font-medium text-sky-blue hover:underline cursor-pointer"
            >
              Quên mật khẩu? / Forgot password?
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập / Sign in'}
          </Button>
          <div className="flex items-center gap-3 text-sm text-light-gray">
            <span className="h-px flex-1 bg-muted-stone" /> hoặc / or <span className="h-px flex-1 bg-muted-stone" />
          </div>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/register')}>Đăng ký tài khoản mới / Create account</Button>
        </form>
      </Card>
      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </motion.div>
  )
}
