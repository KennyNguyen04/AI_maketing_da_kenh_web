export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type SourceType = 'url' | 'text' | 'form'
// 'x' is the canonical name for the Twitter/X platform.
// 'twitter' is kept as an alias for backward compatibility with existing drafts
// created before the rebrand.
export type Channel = 'linkedin_post' | 'linkedin_thread' | 'facebook' | 'x' | 'twitter'
