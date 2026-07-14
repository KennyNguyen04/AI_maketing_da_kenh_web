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

  const isRegistered = user.user_metadata?.extension_registered === true

  return (
    <ExtensionStatusBanner hasToken={hasToken} isRegistered={isRegistered} />
  )
}
