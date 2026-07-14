'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'

const CHANNELS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'facebook-group', label: 'Facebook Group' },
  { id: 'threads', label: 'Threads' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X (Twitter)' },
]

interface ChannelLimit {
  perDay: number
  perHour: number
  minIntervalS: number
  enabled: boolean
}

interface RateLimits {
  [channel: string]: ChannelLimit
}

interface ExtensionSettings {
  rate_limits: RateLimits
  auto_preview: boolean
  preview_delay_seconds: number
}

export function ExtensionSettingsForm() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/extension/user-settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/extension/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate_limits: settings.rate_limits,
          auto_preview: settings.auto_preview,
          preview_delay_seconds: settings.preview_delay_seconds,
        }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function updateChannelLimit(channel: string, field: keyof ChannelLimit, value: number | boolean) {
    if (!settings) return
    setSettings({
      ...settings,
      rate_limits: {
        ...settings.rate_limits,
        [channel]: {
          ...settings.rate_limits[channel],
          [field]: value,
        },
      },
    })
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-app-muted" />
        <span className="ml-2 text-sm text-app-muted">Đang tải cài đặt...</span>
      </Card>
    )
  }

  if (error && !settings) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-sunset-orange">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="ghost" className="mt-3" onClick={loadSettings}>
          Thử lại
        </Button>
      </Card>
    )
  }

  if (!settings) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-blue/10">
            <Settings className="h-5 w-5 text-sky-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-midnight-ink">Cài đặt Extension</h2>
            <p className="text-sm text-app-muted">Cấu hình hành vi auto-post của Chrome Extension</p>
          </div>
        </div>

        {/* Preview Settings */}
        <div className="mb-6 space-y-4 rounded-card bg-app-bg p-4">
          <h3 className="text-sm font-medium text-midnight-ink">Preview trước khi đăng</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-midnight-ink">Hiện preview</p>
              <p className="text-xs text-app-muted">Hiện hộp thoại xác nhận trước khi đăng bài</p>
            </div>
            <Toggle
              checked={settings.auto_preview}
              onChange={(checked) => setSettings({ ...settings, auto_preview: checked })}
            />
          </div>

          {settings.auto_preview && (
            <div className="max-w-[200px]">
              <Input
                type="number"
                label="Thời gian đếm ngược (giây)"
                value={settings.preview_delay_seconds}
                onChange={(val) => {
                  const num = parseInt(val) || 0
                  setSettings({ ...settings, preview_delay_seconds: Math.min(300, Math.max(0, num)) })
                }}
                helper="0-300 giây"
              />
            </div>
          )}
        </div>

        {/* Rate Limits */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-midnight-ink">Giới hạn đăng bài theo kênh</h3>
          
          <div className="space-y-4">
            {CHANNELS.map((channel) => {
              const limit = settings.rate_limits[channel.id] || {
                perDay: 5,
                perHour: 2,
                minIntervalS: 1800,
                enabled: true,
              }
              return (
                <div key={channel.id} className="rounded-card border border-app-line p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-midnight-ink">{channel.label}</p>
                    <Toggle
                      checked={limit.enabled}
                      onChange={(checked) => updateChannelLimit(channel.id, 'enabled', checked)}
                    />
                  </div>
                  
                  {limit.enabled && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-app-muted">Bài/ngày</label>
                        <Input
                          type="number"
                          value={limit.perDay}
                          onChange={(val) => updateChannelLimit(channel.id, 'perDay', parseInt(val) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-app-muted">Bài/giờ</label>
                        <Input
                          type="number"
                          value={limit.perHour}
                          onChange={(val) => updateChannelLimit(channel.id, 'perHour', parseInt(val) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-app-muted">Khoảng cách (phút)</label>
                        <Input
                          type="number"
                          value={Math.round(limit.minIntervalS / 60)}
                          onChange={(val) => updateChannelLimit(channel.id, 'minIntervalS', (parseInt(val) || 0) * 60)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-3 border-t border-app-line pt-4">
          <Button onClick={saveSettings} isLoading={saving}>
            Lưu cài đặt
          </Button>
          {success && (
            <span className="flex items-center gap-1 text-sm text-forest-fern">
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-sm text-sunset-orange">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
