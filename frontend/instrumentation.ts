/**
 * Next.js instrumentation — runs once when the server boots.
 * Validates environment variables early to fail fast in production deploys.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env')
    const result = validateEnv(true)

    if (!result.ok) {
      const formatted = result.errors.map((e) => `  - ${e}`).join('\n')
      console.error(`[instrumentation] Environment validation failed:\n${formatted}`)
      // Don't throw — surface as visible error and let health checks catch it
    } else {
      console.log('[instrumentation] Environment validation passed')
      if (result.warnings.length > 0) {
        for (const w of result.warnings) console.warn(`[instrumentation] ${w}`)
      }
    }
  }
}