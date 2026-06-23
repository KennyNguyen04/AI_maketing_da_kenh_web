'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card className="w-full max-w-[600px] border border-sunset-orange/20 bg-pure-canvas p-10 shadow-lg transition-all duration-300">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunset-orange/10 text-vibrant-orange animate-pulse">
                <AlertTriangle className="h-8 w-8" />
              </div>
              
              <h2 className="mt-6 text-2xl font-semibold text-midnight-ink">
                Đã xảy ra sự cố ngoài ý muốn
              </h2>
              <p className="mt-2 text-sm text-dark-charcoal font-medium">
                An unexpected error occurred in the application
              </p>
              
              <p className="mt-4 text-sm text-light-gray max-w-md mx-auto">
                Hệ thống gặp lỗi không thể tự động khôi phục. Vui lòng tải lại trang hoặc thử lại sau.
              </p>

              <div className="mt-8 flex justify-center gap-4">
                <Button variant="ghost" onClick={() => window.location.href = '/dashboard'}>
                  Về Dashboard / Home
                </Button>
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tải lại trang / Reload
                </Button>
              </div>

              {this.state.error && (
                <div className="mt-8 text-left border-t border-muted-stone pt-6">
                  <button
                    type="button"
                    onClick={this.toggleDetails}
                    className="flex items-center gap-1 text-xs font-semibold text-sky-blue hover:underline focus:outline-none"
                  >
                    {this.state.showDetails ? (
                      <>
                        Ẩn chi tiết kỹ thuật / Hide details <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Xem chi tiết kỹ thuật / View details <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>

                  {this.state.showDetails && (
                    <div className="mt-3 max-h-[200px] overflow-auto rounded bg-warm-sand p-4 font-mono text-[11px] text-vibrant-orange border border-muted-stone">
                      <p className="font-semibold">{this.state.error.toString()}</p>
                      {this.state.errorInfo?.componentStack && (
                        <pre className="mt-2 whitespace-pre-wrap text-dark-charcoal opacity-80">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
