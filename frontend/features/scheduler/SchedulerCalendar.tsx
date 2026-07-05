'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface ScheduledPost {
  id: string
  channel: string
  content: string
  scheduled_for: string
  job_title?: string
}

interface SchedulerCalendarProps {
  posts: ScheduledPost[]
  onDateClick?: (date: Date) => void
  onPostClick?: (post: ScheduledPost) => void
  className?: string
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = [
  'Th?ng 1', 'Th?ng 2', 'Th?ng 3', 'Th?ng 4', 'Th?ng 5', 'Th?ng 6',
  'Th?ng 7', 'Th?ng 8', 'Th?ng 9', 'Th?ng 10', 'Th?ng 11', 'Th?ng 12'
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Adjust for Monday start
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2)
}

export function SchedulerCalendar({ posts, onDateClick, onPostClick, className }: SchedulerCalendarProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const postsByDate = posts.reduce((acc, post) => {
    const dateKey = post.scheduled_for.split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(post)
    return acc
  }, {} as Record<string, ScheduledPost[]>)

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    onDateClick?.(date)
  }

  const renderDays = () => {
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-app-line bg-app-bg p-1" />
      )
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const dateKey = formatDateKey(date)
      const dayPosts = postsByDate[dateKey] || []
      const isToday = isSameDay(date, today)
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            'h-24 cursor-pointer border border-app-line p-1 transition-colors',
            isToday && 'border-sky-blue/40 bg-sky-blue/5',
            isPast && 'opacity-50',
            !isPast && 'hover:bg-app-bg'
          )}
        >
          <div className="mb-1 flex items-center justify-between">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium',
                isToday && 'bg-sky-blue text-pure-canvas'
              )}
            >
              {day}
            </span>
            {dayPosts.length > 0 && (
              <span className="rounded-badge bg-sky-blue/10 px-1.5 py-0.5 text-xs text-sky-blue">
                {dayPosts.length}
              </span>
            )}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {dayPosts.slice(0, 2).map((post) => (
              <button
                key={post.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onPostClick?.(post)
                }}
                className="w-full truncate rounded bg-app-bg p-1 text-left text-xs transition-colors hover:bg-app-line"
              >
                <span className={cn(
                  'mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-blue',
                )} />
                {post.content.substring(0, 30)}
              </button>
            ))}
            {dayPosts.length > 2 && (
              <span className="pl-1 text-xs text-app-muted">
                +{dayPosts.length - 2} more
              </span>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className={cn('rounded-card border border-app-line bg-pure-canvas', className)}>
      <div className="flex items-center justify-between border-b border-app-line p-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-app-muted" />
          <h3 className="font-semibold text-midnight-ink">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-nav px-3 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-bg hover:text-midnight-ink"
          >
            H?m nay
          </button>
          <button
            onClick={goToPrevMonth}
            className="rounded-nav p-1.5 transition-colors hover:bg-app-bg"
            aria-label="Th?ng tr??c"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-nav p-1.5 transition-colors hover:bg-app-bg"
            aria-label="Th?ng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-b border-app-line bg-app-bg/50 p-2 text-center text-sm font-medium text-app-muted"
          >
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
    </div>
  )
}
