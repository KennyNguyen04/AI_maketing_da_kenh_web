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
      <div className={cn('bg-white rounded-lg border border-light-border p-8 text-center', className)}>
        <p className="text-dark-charcoal/60">Không có dữ liệu để hiển thị</p>
      </div>
    )
  }

  const chartData: ChartDataPoint[] = sortedDates.map(date => ({
    date,
    ...data[date],
  }))

  return (
    <div className={cn('bg-white rounded-lg border border-light-border', className)}>
      <div className="p-4 border-b border-light-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-midnight-ink">Biểu đồ hoạt động</h3>
          <p className="text-sm text-dark-charcoal/60 mt-0.5">
            Số bài đăng theo ngày
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-light-surface rounded-lg">
          <button
            onClick={() => setViewMode('bar')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'bar'
                ? 'bg-white text-midnight-ink shadow-sm'
                : 'text-dark-charcoal/60 hover:text-midnight-ink'
            )}
          >
            Cột
          </button>
          <button
            onClick={() => setViewMode('line')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'line'
                ? 'bg-white text-midnight-ink shadow-sm'
                : 'text-dark-charcoal/60 hover:text-midnight-ink'
            )}
          >
            Đường
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-dark-charcoal/60">Tổng cộng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-dark-charcoal/60">Thành công</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm text-dark-charcoal/60">Thất bại</span>
          </div>
        </div>

        {/* Simple Bar/Line Chart */}
        <div className="relative h-48">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-dark-charcoal/40">
            <span>{maxValue}</span>
            <span>{Math.round(maxValue * 0.75)}</span>
            <span>{Math.round(maxValue * 0.5)}</span>
            <span>{Math.round(maxValue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute left-8 right-0 top-0 bottom-4 flex items-end justify-between gap-1">
            {chartData.map((point, index) => {
              const totalHeight = (point.total / maxValue) * 100
              const successHeight = (point.successful / maxValue) * 100
              const failHeight = (point.failed / maxValue) * 100

              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-end group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-midnight-ink text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-medium">{formatDateLabel(point.date)}</div>
                    <div>Tổng: {point.total}</div>
                    <div>Thành công: {point.successful}</div>
                    <div>Thất bại: {point.failed}</div>
                  </div>

                  {viewMode === 'bar' ? (
                    // Stacked Bar
                    <div className="w-full flex flex-col items-center gap-0.5">
                      {point.total > 0 && (
                        <>
                          <div
                            className="w-full bg-red-400 rounded-t"
                            style={{ height: `${failHeight}%`, minHeight: failHeight > 0 ? '4px' : '0' }}
                          />
                          <div
                            className="w-full bg-green-500 rounded-t"
                            style={{ height: `${successHeight}%`, minHeight: '4px' }}
                          />
                          <div
                            className="w-full bg-primary/30 rounded-b"
                            style={{ height: `${Math.max(0, (point.total - point.successful - point.failed) / maxValue * 100)}%` }}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    // Simple Line Points
                    <div
                      className="w-2 h-2 rounded-full bg-primary absolute"
                      style={{ bottom: `${totalHeight}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute left-8 right-0 bottom-0 flex justify-between text-xs text-dark-charcoal/40">
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
