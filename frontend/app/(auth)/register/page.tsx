'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Mật khẩu không khớp / Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự / Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="w-[480px] p-12 shadow-lg">
        <h1 className="text-center text-[32px] text-midnight-ink">Amplify</h1>
        <p className="mt-3 text-center text-dark-charcoal">Tạo tài khoản miễn phí / Create your free account</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error ? (
            <div className="rounded-card bg-sunset-orange/10 px-4 py-3 text-sm text-vibrant-orange">
              {error}
            </div>
          ) : null}
          <Input label="Họ và tên / Full name" placeholder="Nguyễn Văn A" value={name} onChange={setName} required />
          <Input label="Email" type="email" placeholder="ban@example.com" value={email} onChange={setEmail} required />
          <Input label="Mật khẩu / Password" type="password" value={password} onChange={setPassword} required />
          <Input label="Xác nhận mật khẩu / Confirm password" type="password" value={confirm} onChange={setConfirm} required />
          <p className="text-xs leading-5 text-dark-charcoal">Bằng cách đăng ký, bạn đồng ý với Điều khoản sử dụng.</p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản / Create account'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>Đã có tài khoản? Đăng nhập / Already have account? Sign in</Button>
        </form>
      </Card>
    </motion.div>
  )
}
