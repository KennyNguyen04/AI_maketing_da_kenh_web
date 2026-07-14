import { ExtensionStatusBanner } from '@/components/ExtensionStatusBanner'
import { createClient } from '@/lib/supabase/server'

export async function ExtensionStatusCheck() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check api_keys table directly (authoritative source for "has token").
  // Falls back to user_metadata.has_api_token if table query fails for any reason.
  let hasToken = false
  try {
    const { data } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    hasToken = !!data
  } catch {
    hasToken = !!user.user_metadata?.has_api_token
  }

  // Authoritative layer 1: user_metadata.extension_registered (set by /api/extension/register).
  let isRegistered = user.user_metadata?.extension_registered === true

  // 14jul 2026 fix — defensive layer 2: nếu extension đã tạo task trong 24h,
  // nghĩa là register đã thành công (vì mọi task require Bearer token hợp lệ).
  // Trước đây chỉ check metadata, gây mismatch với popup state khi
  // AMPLIFY_TOKEN_SAVED fire nhưng /register failed silently.
  if (!isRegistered) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count } = await supabase
        .from('extension_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', twentyFourHoursAgo)
      isRegistered = (count || 0) > 0
    } catch (e) {
      console.error('[ExtensionStatusCheck] fallback query failed:', e)
      // giữ isRegistered = false nếu query fail
    }
  }

  return (
    <ExtensionStatusBanner hasToken={hasToken} isRegistered={isRegistered} />
  )
}