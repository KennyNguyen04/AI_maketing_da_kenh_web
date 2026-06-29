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

// Exact-match sensitive keys (case-insensitive comparison).
const SENSITIVE_KEYS = new Set([
  'access_token', 'accesstoken',
  'refresh_token', 'refreshtoken',
  'access_token_secret', 'accesstokensecret',
  'access_token_encrypted', 'refreshtoken_encrypted',
  'authorization',
  'password', 'passwd', 'pwd',
  'cookie',
  'session',
  'token',
  'id_token', 'idtoken',
  'api_key', 'apikey',
  'secret', 'client_secret', 'appsecret', 'appsecret_proof',
  'code', // OAuth authorization code
  'code_verifier', 'codechallenge', // PKCE
  'state', // OAuth state (can enable CSRF if leaked)
  'set-cookie', 'setcookie',
  'x-api-key', 'xapikey',
])

// Partial-match sensitive substrings (case-insensitive). Use for things like
// `user_access_token` where exact match won't catch them.
const SENSITIVE_PATTERNS: RegExp[] = [
  /token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /api[_-]?key/i,
  /bearer/i,
  /^auth(orization)?$/i,
]

function isSensitiveKey(key: string): boolean {
  if (SENSITIVE_KEYS.has(key)) return true
  return SENSITIVE_PATTERNS.some((re) => re.test(key))
}

/**
 * Mask sensitive fields in any nested value to prevent token leakage in logs.
 * Only redacts JWT-shaped strings (3 base64url segments) inside string values —
 * does NOT heuristically redact arbitrary long opaque strings because that
 * produces false positives on content hashes, file slugs, encoded IDs etc.
 */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 10) return '[DEPTH_LIMIT]'
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    // Detect JWT-shaped strings (3 base64url segments separated by dots, with
    // realistic minimum lengths to avoid false positives on dotted paths/UUIDs).
    if (/^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) {
      return '[REDACTED_JWT]'
    }
    return value
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? '[REDACTED]' : redact(v, depth + 1)
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