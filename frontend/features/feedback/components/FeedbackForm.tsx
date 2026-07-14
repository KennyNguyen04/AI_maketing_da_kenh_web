'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Star, Send, CheckCircle } from 'lucide-react'

const FEEDBACK_TYPES = [
  { value: 'general', label: 'Phản hồi chung' },
  { value: 'bug', label: 'Báo lỗi' },
  { value: 'feature', label: 'Yêu cầu tính năng mới' },
  { value: 'complaint', label: 'Khiếu nại' },
  { value: 'praise', label: 'Khen ngợi' },
]

interface FeedbackFormProps {
  variant?: 'card' | 'inline'
  onSuccess?: () => void
  onClose?: () => void
}

export function FeedbackForm({ variant = 'card', onSuccess, onClose }: FeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState('general')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!message.trim()) {
      setError('Vui lòng nhập nội dung phản hồi')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: feedbackType,
          message: message.trim(),
          rating,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi phản hồi')
      }

      setIsSuccess(true)
      setMessage('')
      setRating(null)
      setFeedbackType('general')
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setMessage('')
    setRating(null)
    setFeedbackType('general')
    setError(null)
  }

  const renderStars = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(rating === star ? null : star)}
          className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-blue/25"
          aria-label={`Rate ${star} star`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              rating !== null && star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-app-muted hover:text-amber-400/70'
            }`}
          />
        </button>
      ))}
      {rating && (
        <span className="ml-2 text-sm text-app-muted">
          {rating}/5
        </span>
      )}
    </div>
  )

  const renderSuccess = () => (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle className="h-16 w-16 text-forest-fern mb-4" />
      <h3 className="text-lg font-semibold text-midnight-ink">Cảm ơn bạn!</h3>
      <p className="mt-2 text-sm text-app-muted max-w-[300px]">
        Phản hồi của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và cải thiện sản phẩm dựa trên ý kiến của bạn.
      </p>
      <Button variant="outline" className="mt-6" onClick={handleReset}>
        Gửi phản hồi khác
      </Button>
    </Card>
  )

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-midnight-ink">
          Loại phản hồi
        </label>
        <Select
          value={feedbackType}
          onChange={(e) => setFeedbackType(e.target.value)}
          options={FEEDBACK_TYPES}
          placeholder="Chọn loại phản hồi"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-midnight-ink">
          Đánh giá <span className="text-app-muted font-normal">(tùy chọn)</span>
        </label>
        {renderStars()}
        <p className="text-xs text-app-muted">
          Bạn có hài lòng với trải nghiệm không?
        </p>
      </div>

      <div className="space-y-2">
        <Input
          type="textarea"
          label="Nội dung phản hồi"
          placeholder="Chia sẻ ý kiến của bạn về Amplify..."
          value={message}
          onChange={setMessage}
          rows={5}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-sunset-orange">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!message.trim()}
        >
          <Send className="h-4 w-4" />
          Gửi phản hồi
        </Button>
        {onClose && (
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  )

  if (variant === 'inline') {
    return isSuccess ? renderSuccess() : renderForm()
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-midnight-ink">Gửi phản hồi</h2>
        <p className="mt-1 text-sm text-app-muted">
          Chia sẻ ý kiến của bạn để giúp chúng tôi cải thiện Amplify
        </p>
      </div>
      {isSuccess ? renderSuccess() : renderForm()}
    </Card>
  )
}
