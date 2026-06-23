export type SocialProvider = 'x' | 'facebook'
export type PublishStatus = 'draft' | 'publishing' | 'published' | 'failed'

export interface PublishTarget {
  provider: SocialProvider
  externalId: string
  displayName: string
  type: 'profile' | 'page'
}

export interface SocialAccount {
  id: string
  provider: SocialProvider
  external_account_id: string
  display_name: string
  account_type: 'profile' | 'page'
  scopes: string[]
  token_expires_at: string | null
  created_at: string
}
