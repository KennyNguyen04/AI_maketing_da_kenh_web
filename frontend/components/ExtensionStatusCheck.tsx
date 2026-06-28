import { ExtensionStatusBanner } from '@/components/ExtensionStatusBanner'
import { createClient } from '@/lib/supabase/server'

export async function ExtensionStatusCheck() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const hasToken = !!user.user_metadata?.api_token_hash
  const isRegistered = user.user_metadata?.extension_registered === true

  return (
    <ExtensionStatusBanner hasToken={hasToken} isRegistered={isRegistered} />
  )
}
