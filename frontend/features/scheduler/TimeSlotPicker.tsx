'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Clock, Calendar, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TimeSlotPickerProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (draftId: string, dateTime: Date) => Promise<void>
  draftId: string
  channel: string
  initialDate?: Date
  minDate?: Date
  maxDate?: Date
  className?: string
}

const QUICK_TIMES = [
  { label: '9:00', hour: 9, minute: 0 },
  { label: '12:00', hour: 12, minute: 0 },
  { label: '15:00', hour: 15, minute: 0 },
  { label: '18:00', hour: 18, minute: 0 },
  { label: '20:00', hour: 20, minute: 0 },
]

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

export function TimeSlotPicker({
  isOpen,
  onClose,
  onSchedule,
  draftId,
  channel,
  initialDate,
  minDate,
  maxDate,
  className
}: TimeSlotPickerProps) {
  const now = new Date()
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDate || new Date(now.getTime() + 86400000) // Tomorrow
  )
  const [selectedHour, setSelectedHour] = useState(9)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC handler + focus management
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    // Focus the modal for screen readers
    setTimeout(() => modalRef.current?.focus(), 0)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const currentMonth = selectedDate.getMonth()
  const currentYear = selectedDate.getFullYear()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Monday start

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setSelectedDate(new Date(currentYear - 1, 11, 1))
    } else {
      setSelectedDate(new Date(currentYear, currentMonth - 1, 1))
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setSelectedDate(new Date(currentYear + 1, 0, 1))
    } else {
      setSelectedDate(new Date(currentYear, currentMonth + 1, 1))
    }
  }

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day, selectedHour, selectedMinute)
    if (minDate && newDate < minDate) return
    if (maxDate && newDate > maxDate) return
    setSelectedDate(newDate)
  }

  const handleQuickTime = (hour: number, minute: number) => {
    setSelectedHour(hour)
    setSelectedMinute(minute)
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setHours(hour, minute, 0, 0)
      return newDate
    })
  }

  const handleSchedule = async () => {
    const scheduleDate = new Date(selectedDate)
    scheduleDate.setHours(selectedHour, selectedMinute, 0, 0)

    if (scheduleDate <= new Date()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSchedule(draftId, scheduleDate)
      onClose()
    } catch (error) {
      console.error('Failed to schedule:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDateDisabled = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day)
    date.setHours(0, 0, 0, 0)
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (date < today) return true
    return false
  }

  const renderCalendar = () => {
    const days = []

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isDisabled = isDateDisabled(day)
      const isSelected = selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear
      const isToday = today.getDate() === day &&
        today.getMonth() === currentMonth &&
        today.getFullYear() === currentYear

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          disabled={isDisabled}
          className={cn(
            'h-10 w-10 rounded-full text-sm font-medium transition-colors',
            isDisabled && 'cursor-not-allowed text-app-muted/40',
            !isDisabled && 'hover:bg-app-bg',
            isSelected && 'bg-sky-blue text-pure-canvas hover:bg-sky-blue',
            isToday && !isSelected && 'border border-sky-blue text-sky-blue'
          )}
        >
          {day}
        </button>
      )
    }

    return days
  }

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-pitch-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-slot-title"
        tabIndex={-1}
        className="relative max-w-md mx-4 w-full overflow-hidden rounded-card border border-app-line bg-pure-canvas shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-line p-4">
          <div>
            <h2 id="time-slot-title" className="font-semibold text-midnight-ink">Đặt lịch đăng bài</h2>
            <p className="mt-0.5 text-sm text-app-muted">Chọn ngày và giờ đăng bài</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-nav p-2 transition-colors hover:bg-app-bg"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-app-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Calendar */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="rounded-nav p-1.5 transition-colors hover:bg-app-bg"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-medium text-midnight-ink">
                {MONTHS_VI[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="rounded-nav p-1.5 transition-colors hover:bg-app-bg"
                aria-label="Tháng sau"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex h-10 items-center justify-center text-xs font-medium text-app-muted">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Selected Date Display */}
          <div className="flex items-center gap-2 rounded-card bg-app-bg p-3">
            <Calendar className="h-5 w-5 text-sky-blue" />
            <span className="text-sm font-medium text-midnight-ink">
              {formatDate(selectedDate)}
            </span>
          </div>

          {/* Quick Time Buttons */}
          <div>
            <label className="mb-2 block text-sm font-medium text-midnight-ink">
              Chọn giờ nhanh
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIMES.map((time) => (
                <button
                  key={time.label}
                  onClick={() => handleQuickTime(time.hour, time.minute)}
                  className={cn(
                    'rounded-nav border px-3 py-2 text-sm transition-colors',
                    selectedHour === time.hour && selectedMinute === time.minute
                      ? 'border-sky-blue bg-sky-blue text-pure-canvas'
                      : 'border-app-line bg-pure-canvas text-midnight-ink hover:bg-app-bg'
                  )}
                >
                  <Clock className="mr-1 inline-block h-3.5 w-3.5" />
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Time Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-midnight-ink">
              Hoặc chọn giờ tùy chỉnh
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedHour}
                onChange={(e) => {
                  const hour = parseInt(e.target.value, 10)
                  setSelectedHour(hour)
                  setSelectedDate(prev => {
                    const newDate = new Date(prev)
                    newDate.setHours(hour, selectedMinute, 0, 0)
                    return newDate
                  })
                }}
                className="flex-1 rounded-card border border-app-line bg-pure-canvas p-2 text-sm focus:border-sky-blue focus:outline-none focus:ring-2 focus:ring-sky-blue/20"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className="text-app-muted">:</span>
              <select
                value={selectedMinute}
                onChange={(e) => {
                  const minute = parseInt(e.target.value, 10)
                  setSelectedMinute(minute)
                  setSelectedDate(prev => {
                    const newDate = new Date(prev)
                    newDate.setHours(selectedHour, minute, 0, 0)
                    return newDate
                  })
                }}
                className="flex-1 rounded-card border border-app-line bg-pure-canvas p-2 text-sm focus:border-sky-blue focus:outline-none focus:ring-2 focus:ring-sky-blue/20"
              >
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-app-line bg-app-bg/50 p-4">
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {!isSubmitting && <Check className="mr-2 h-4 w-4" />}
            Đặt lịch
          </Button>
        </div>
      </div>
    </div>
  )
}
