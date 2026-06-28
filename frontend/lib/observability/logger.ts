/**
 * Request-scoped structured logger for API routes.
 * All variables are request-scoped and garbage-collected when the request ends.
 * In Next.js serverless, console.* output is captured by the platform.
 * For production log aggregation, replace with pino or similar.
 */
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

const SENSITIVE_KEYS = new Set([
  'access_token', 'accessToken',
  'refresh_token', 'refreshToken',
  'access_token_secret', 'accessTokenSecret',
  'authorization', 'Authorization',
  'password', 'passwd',
  'cookie', 'Cookie',
  'session', 'token',
  'id_token',
  'api_key', 'apiKey',
  'secret',
])

/** Mask sensitive fields in any nested value to prevent token leakage in logs. */
function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(redact)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redact(v)
    }
    return out
  }
  return value
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const safeContext = redact(context) as LogContext
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...safeContext,
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
