export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type SourceType = 'url' | 'text' | 'form'
// 'x' is the canonical name for the Twitter/X platform.
// 'twitter' is kept as an alias for backward compatibility with existing drafts
// created before the rebrand.
// 'threads' was added 2026-07-15: automator (extension/automators/threads.js)
// is wired and AI prompts/config exist; see migration 023 for the matching
// drafts.channel CHECK update.
export type Channel = 'linkedin_post' | 'linkedin_thread' | 'facebook' | 'x' | 'twitter' | 'threads'
