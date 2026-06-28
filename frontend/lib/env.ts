/**
 * Centralized environment variable validation.
 * Importing this module validates required env vars at startup (or first use)
 * and fails fast with a clear error message instead of cryptic runtime failures.
 */

const REQUIRED_PUBLIC = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const REQUIRED_SERVER = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TOKEN_ENCRYPTION_KEY',
  'GOOGLE_AI_API_KEY',
] as const

const OPTIONAL_SERVER = [
  'INNGEST_EVENT_KEY',
  'INNGEST_SIGNING_KEY',
  'X_CLIENT_ID',
  'X_CLIENT_SECRET',
  'X_REDIRECT_URI',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_REDIRECT_URI',
  'NEXT_PUBLIC_APP_URL',
] as const

let validated = false
let validationErrors: string[] = []

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isSupabaseUrl(value: string): boolean {
  return value.startsWith('https://') && value.includes('.supabase.')
}

export function validateEnv(force = false): { ok: boolean; errors: string[]; warnings: string[] } {
  if (validated && !force) {
    return { ok: validationErrors.length === 0, errors: validationErrors, warnings: [] }
  }

  validationErrors = []
  const warnings: string[] = []

  // Public vars — required everywhere
  for (const key of REQUIRED_PUBLIC) {
    const value = process.env[key]
    if (!value || value.trim().length === 0) {
      validationErrors.push(`Missing required env var: ${key}`)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !isSupabaseUrl(supabaseUrl)) {
    validationErrors.push(`NEXT_PUBLIC_SUPABASE_URL looks invalid: ${supabaseUrl}`)
  }

  // Server vars — only validated on server
  if (typeof window === 'undefined') {
    for (const key of REQUIRED_SERVER) {
      const value = process.env[key]
      if (!value || value.trim().length === 0) {
        validationErrors.push(`Missing required server env var: ${key}`)
      }
    }

    // Format-specific checks
    if (process.env.TOKEN_ENCRYPTION_KEY && process.env.TOKEN_ENCRYPTION_KEY.length < 32) {
      validationErrors.push('TOKEN_ENCRYPTION_KEY must be at least 32 characters for adequate security')
    }
  }

  // Optional vars — warn if missing but don't fail
  for (const key of OPTIONAL_SERVER) {
    if (!process.env[key]) {
      warnings.push(`Optional env var not set: ${key}`)
    }
  }

  validated = true
  return { ok: validationErrors.length === 0, errors: validationErrors, warnings }
}

/**
 * Throw a clear error if required env vars are missing.
 * Call at module load time in server-side entry points.
 */
export function assertEnv() {
  const { ok, errors } = validateEnv()
  if (!ok) {
    const formatted = errors.map((e) => `  - ${e}`).join('\n')
    throw new Error(`Environment validation failed:\n${formatted}`)
  }
}

/**
 * Suppress console warnings about missing optional env vars.
 * Useful in development where optional integrations may not be configured.
 */
export function suppressOptionalWarnings() {
  validated = true
}