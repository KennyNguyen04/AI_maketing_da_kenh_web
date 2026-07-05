'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ChartDataPoint {
  date: string
  total: number
  successful: number
  failed: number
}

interface StatsChartProps {
  data: Record<string, { total: number; successful: number; failed: number }>
  className?: string
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function StatsChart({ data, className }: StatsChartProps) {
  const [viewMode, setViewMode] = useState<'bar' | 'line'>('bar')

  const sortedDates = Object.keys(data).sort()
  const maxValue = Math.max(...Object.values(data).map(d => d.total), 1)

  if (sortedDates.length === 0) {
    return (
      <div className={cn('rounded-card border border-app-line bg-pure-canvas p-8 text-center', className)}>
        <p className="text-app-muted">Không có dữ liệu để hiển thị</p>
      </div>
    )
  }

  const chartData: ChartDataPoint[] = sortedDates.map(date => ({
    date,
    ...data[date],
  }))

  return (
    <div className={cn('rounded-card border border-app-line bg-pure-canvas', className)}>
      <div className="flex items-center justify-between border-b border-app-line p-4">
        <div>
          <h3 className="font-semibold text-midnight-ink">Biểu đồ hoạt động</h3>
          <p className="mt-0.5 text-sm text-app-muted">
            Số bài đăng theo ngày
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-card bg-app-bg p-1">
          <button
            onClick={() => setViewMode('bar')}
            className={cn(
              'rounded-nav px-3 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'bar'
                ? 'bg-pure-canvas text-midnight-ink shadow-sm'
                : 'text-app-muted hover:text-midnight-ink'
            )}
          >
            Cột
          </button>
          <button
            onClick={() => setViewMode('line')}
            className={cn(
              'rounded-nav px-3 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'line'
                ? 'bg-pure-canvas text-midnight-ink shadow-sm'
                : 'text-app-muted hover:text-midnight-ink'
            )}
          >
            Đường
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Legend */}
        <div className="mb-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-sky-blue h-3 w-3 rounded-full" />
            <span className="text-sm text-app-muted">Tổng cộng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-forest-fern h-3 w-3 rounded-full" />
            <span className="text-sm text-app-muted">Thành công</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-vibrant-orange h-3 w-3 rounded-full" />
            <span className="text-sm text-app-muted">Thất bại</span>
          </div>
        </div>

        {/* Simple Bar/Line Chart */}
        <div className="relative h-48">
          {/* Y-axis labels */}
          <div className="absolute bottom-0 left-0 top-0 flex flex-col justify-between text-xs text-app-muted/60">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute bottom-4 left-8 right-0 top-0 flex items-end justify-between gap-1">
            {chartData.map((point) => {
              const totalHeight = (point.total / maxValue) * 100
              const successHeight = (point.successful / maxValue) * 100
              const failHeight = (point.failed / maxValue) * 100

              return (
                <div
                  key={point.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 rounded bg-midnight-ink px-2 py-1 text-xs whitespace-nowrap text-pure-canvas opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-10">
                    <div className="font-medium">{formatDateLabel(point.date)}</div>
                    <div>Tổng: {point.total}</div>
                    <div>Thành công: {point.successful}</div>
                    <div>Thất bại: {point.failed}</div>
                  </div>

                  {viewMode === 'bar' ? (
                    // Stacked Bar
                    <div className="flex w-full flex-col items-center gap-0.5">
                      {point.total > 0 && (
                        <>
                          <div
                            className="bg-vibrant-orange w-full rounded-t"
                            style={{ height: `${failHeight}%`, minHeight: failHeight > 0 ? '4px' : '0' }}
                          />
                          <div
                            className="bg-forest-fern w-full rounded-t"
                            style={{ height: `${successHeight}%`, minHeight: '4px' }}
                          />
                          <div
                            className="bg-sky-blue/30 w-full rounded-b"
                            style={{ height: `${Math.max(0, (point.total - point.successful - point.failed) / maxValue * 100)}%` }}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    // Simple Line Points
                    <div
                      className="bg-sky-blue absolute h-2 w-2 rounded-full"
                      style={{ bottom: `${totalHeight}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-app-muted/60">
            {chartData.length <= 7 ? (
              chartData.map((point) => (
                <span key={point.date}>{formatDateLabel(point.date)}</span>
              ))
            ) : (
              <>
                <span>{formatDateLabel(chartData[0].date)}</span>
                <span>{formatDateLabel(chartData[Math.floor(chartData.length / 2)].date)}</span>
                <span>{formatDateLabel(chartData[chartData.length - 1].date)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
