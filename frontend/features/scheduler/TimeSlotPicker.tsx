'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Clock, Calendar, Check } from 'lucide-react'
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

    // Empty cells for days before the first day
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />)
    }

    // Days of the month
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
            isDisabled && 'text-dark-charcoal/30 cursor-not-allowed',
            !isDisabled && 'hover:bg-light-surface cursor-pointer',
            isSelected && 'bg-primary text-white hover:bg-primary',
            isToday && !isSelected && 'border border-primary text-primary'
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
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-light-border">
          <div>
            <h2 className="font-semibold text-midnight-ink">Đặt lịch đăng bài</h2>
            <p className="text-sm text-dark-charcoal/60 mt-0.5">Chọn ngày và giờ đăng bài</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-surface rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-dark-charcoal/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-light-surface rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium text-midnight-ink">
                {selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-light-surface rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="h-10 flex items-center justify-center text-xs font-medium text-dark-charcoal/60">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* Selected Date Display */}
          <div className="flex items-center gap-2 p-3 bg-light-surface rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-midnight-ink">
              {formatDate(selectedDate)}
            </span>
          </div>

          {/* Quick Time Buttons */}
          <div>
            <label className="block text-sm font-medium text-midnight-ink mb-2">
              Chọn giờ nhanh
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIMES.map((time) => (
                <button
                  key={time.label}
                  onClick={() => handleQuickTime(time.hour, time.minute)}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border transition-colors',
                    selectedHour === time.hour && selectedMinute === time.minute
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-light-border hover:bg-light-surface text-midnight-ink'
                  )}
                >
                  <Clock className="h-3.5 w-3.5 inline-block mr-1" />
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Time Input */}
          <div>
            <label className="block text-sm font-medium text-midnight-ink mb-2">
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
                className="flex-1 p-2 border border-light-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className="text-dark-charcoal/60">:</span>
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
                className="flex-1 p-2 border border-light-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
        <div className="flex items-center justify-end gap-3 p-4 border-t border-light-border bg-light-surface/50">
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Đang đặt lịch...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Đặt lịch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
