type LogLevel = 'info' | 'warn' | 'error'

interface LogContext {
  requestId?: string
  userId?: string
  route?: string
  method?: string
  status?: number
  durationMs?: number
  errorCode?: string
  [key: string]: unknown
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }

  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export function createRequestLogger(route: string, method: string, userId?: string) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  return {
    requestId,
    info(message: string, context?: LogContext) {
      write('info', message, { requestId, route, method, userId, ...context })
    },
    warn(message: string, context?: LogContext) {
      write('warn', message, { requestId, route, method, userId, ...context })
    },
    error(message: string, error: unknown, context?: LogContext) {
      write('error', message, {
        requestId,
        route,
        method,
        userId,
        errorCode: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        ...context,
      })
    },
    done(status: number, context?: LogContext) {
      write('info', 'request.completed', {
        requestId,
        route,
        method,
        userId,
        status,
        durationMs: Date.now() - startedAt,
        ...context,
      })
    },
  }
}

export function logEvent(message: string, context?: LogContext) {
  write('info', message, context)
}
