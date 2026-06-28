/**
 * AI Generation Budget Tracker
 *
 * Enforces per-user AI generation limits to protect against runaway jobs and abuse.
 * Uses DB-backed atomic counters (PostgreSQL function) for cross-instance consistency.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

const DEFAULT_USER_DAILY_BUDGET = 50 // generations per user per day

export interface BudgetStatus {
  allowed: boolean
  remaining: number
  resetAt: number // epoch ms
}

/**
 * Check if user has remaining AI budget for today.
 * Read-only — does NOT consume a slot.
 */
export async function checkAiBudget(userId: string): Promise<BudgetStatus> {
  const { data, error } = await supabaseAdmin.rpc('check_ai_budget', {
    p_user_id: userId,
    p_daily_limit: DEFAULT_USER_DAILY_BUDGET,
  })

  if (error || !data || data.length === 0) {
    // Fail-closed: if budget check fails, block generation to prevent runaway costs
    console.error('[ai-budget] check failed:', error?.message || 'no data')
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 24 * 60 * 60 * 1000,
    }
  }

  const row = data[0] as { allowed: boolean; remaining: number; reset_at: string }
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  }
}

/**
 * Atomically consume one AI generation slot for this user.
 * Uses a single SQL UPDATE+RETURNING — no read-modify-write race.
 * Returns whether the consumption was allowed and the new remaining count.
 */
export async function consumeAiBudget(userId: string): Promise<BudgetStatus> {
  const { data, error } = await supabaseAdmin.rpc('consume_ai_budget', {
    p_user_id: userId,
    p_daily_limit: DEFAULT_USER_DAILY_BUDGET,
  })

  if (error || !data || data.length === 0) {
    console.error('[ai-budget] consume failed:', error?.message || 'no data')
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 24 * 60 * 60 * 1000,
    }
  }

  const row = data[0] as { allowed: boolean; remaining: number; reset_at: string }
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: new Date(row.reset_at).getTime(),
  }
}

/**
 * Persist a generation record to DB so analytics/admin can audit usage.
 * Fire-and-forget — caller should not block on this.
 */
export async function recordAiGeneration(userId: string, channel: string, success: boolean, tokensUsed?: number) {
  try {
    await supabaseAdmin.from('ai_generations').insert({
      user_id: userId,
      channel,
      success,
      tokens_used: tokensUsed ?? null,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    // best-effort; don't fail user request if logging fails
    console.warn('[ai-budget] failed to record generation:', err instanceof Error ? err.message : err)
  }
}