'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react'

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
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
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
        <div key={`empty-${i}`} className="h-24 border border-light-border bg-light-surface p-1" />
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
            'h-24 border border-light-border p-1 cursor-pointer transition-colors',
            isToday && 'bg-primary/5 border-primary/30',
            isPast && 'opacity-50',
            !isPast && 'hover:bg-light-surface cursor-pointer'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={cn(
                'text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full',
                isToday && 'bg-primary text-white'
              )}
            >
              {day}
            </span>
            {dayPosts.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
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
                className="w-full text-left text-xs p-1 rounded bg-light-surface hover:bg-light-border truncate transition-colors"
              >
                <span className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full mr-1',
                  post.channel === 'twitter' && 'bg-blue-400',
                  post.channel === 'facebook' && 'bg-blue-600',
                  post.channel === 'linkedin_post' && 'bg-sky-600',
                  post.channel === 'linkedin_thread' && 'bg-sky-700'
                )} />
                {post.content.substring(0, 30)}
              </button>
            ))}
            {dayPosts.length > 2 && (
              <span className="text-xs text-dark-charcoal/60 pl-1">
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
    <div className={cn('bg-white rounded-lg border border-light-border', className)}>
      <div className="flex items-center justify-between p-4 border-b border-light-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-dark-charcoal/60" />
          <h3 className="font-semibold text-midnight-ink">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="text-sm px-3 py-1.5 text-dark-charcoal/60 hover:text-midnight-ink hover:bg-light-surface rounded-md transition-colors"
          >
            Hôm nay
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-1.5 hover:bg-light-surface rounded-md transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1.5 hover:bg-light-surface rounded-md transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-dark-charcoal/60 border-b border-light-border bg-light-surface/50"
          >
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
    </div>
  )
}
