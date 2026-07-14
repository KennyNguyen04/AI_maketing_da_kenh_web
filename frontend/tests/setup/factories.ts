/**
 * Test Data Factories — dùng chung cho unit, integration, và security tests.
 *
 * Mỗi factory:
 *  - Trả về một object đầy đủ với default values hợp lệ (giống schema trong supabase-schema.sql).
 *  - Cho phép override các field qua partial input.
 *  - Generate UUID/email duy nhất mỗi lần gọi để test không bị cross-contamination.
 *
 * Pattern:
 *   const user = createMockUser({ plan: 'admin' })
 *   const vault = createMockBrandVault({ user_id: user.id })
 *
 * Lưu ý:
 *  - Columns dùng snake_case (khớp với DB) — không transform sang camelCase.
 *  - encrypted_tokens là base64 strings, KHÔNG phải JWT thật — chỉ cần shape đúng.
 *  - created_at/updated_at mặc định là ISO string tại thời điểm gọi.
 */

let counter = 0
function nextId(): string {
  // Deterministic UUID-ish cho debugging. Format: 00000000-0000-0000-0000-00000000NNNN
  counter += 1
  const n = counter.toString(16).padStart(12, '0')
  return `00000000-0000-0000-0000-${n}`
}

function nextEmail(prefix = 'test'): string {
  return `${prefix}-${counter}@example.test`
}

function nowIso(): string {
  return new Date('2026-01-01T00:00:00Z').toISOString()
}

// ─── Profile / User ────────────────────────────────────────────────

export interface MockProfile {
  id: string
  email: string
  full_name: string | null
  avatar_initials: string
  user_plan: 'free' | 'pro' | 'admin'
  created_at: string
}

export function createMockUser(overrides: Partial<MockProfile> = {}): MockProfile {
  const id = overrides.id ?? nextId()
  counter -= 1 // nextId đã increment; reset để email dùng cùng số với id
  counter += 1
  return {
    id,
    email: overrides.email ?? nextEmail('user'),
    full_name: overrides.full_name ?? 'Test User',
    avatar_initials: overrides.avatar_initials ?? 'TU',
    user_plan: overrides.user_plan ?? 'free',
    created_at: overrides.created_at ?? nowIso(),
  }
}

// ─── Brand Vault ───────────────────────────────────────────────────

export interface MockBrandVault {
  id: string
  user_id: string
  name: string
  voice_profile: {
    tone: string[]
    sentence_style: 'short' | 'medium' | 'long' | 'varied'
    avg_sentence_length: number
    signature_phrases: string[]
    topics: string[]
    avoid: string[]
  } | null
  system_prompt: string | null
  source_type: 'url' | 'text' | 'form'
  raw_input: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function createMockBrandVault(overrides: Partial<MockBrandVault> = {}): MockBrandVault {
  const ts = nowIso()
  return {
    id: overrides.id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    name: overrides.name ?? 'My Brand',
    voice_profile: overrides.voice_profile ?? {
      tone: ['friendly', 'informative'],
      sentence_style: 'medium',
      avg_sentence_length: 18,
      signature_phrases: ['let\'s dive in', 'here\'s the thing'],
      topics: ['productivity', 'remote work'],
      avoid: ['clickbait', 'sensational claims'],
    },
    system_prompt: overrides.system_prompt ?? 'You are a helpful assistant that writes in a friendly tone.',
    source_type: overrides.source_type ?? 'text',
    raw_input: overrides.raw_input ?? 'Sample raw input text for brand voice analysis.',
    is_active: overrides.is_active ?? true,
    created_at: overrides.created_at ?? ts,
    updated_at: overrides.updated_at ?? ts,
  }
}

// ─── Repurpose Job ─────────────────────────────────────────────────

export type MockJobChannel = 'linkedin_post' | 'linkedin_thread' | 'facebook' | 'x' | 'twitter'

export interface MockRepurposeJob {
  id: string
  user_id: string
  brand_vault_id: string | null
  title: string | null
  source_type: 'url' | 'text' | 'form'
  source_content: string
  channels: MockJobChannel[]
  status: 'pending' | 'processing' | 'done' | 'failed'
  error_message: string | null
  created_at: string
}

export function createMockJob(overrides: Partial<MockRepurposeJob> = {}): MockRepurposeJob {
  return {
    id: overrides.id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    brand_vault_id: overrides.brand_vault_id ?? null,
    title: overrides.title ?? 'How to ship faster with AI',
    source_type: overrides.source_type ?? 'text',
    source_content: overrides.source_content ?? 'Long-form article content that will be repurposed for multiple channels.',
    channels: overrides.channels ?? ['linkedin_post', 'facebook'],
    status: overrides.status ?? 'pending',
    error_message: overrides.error_message ?? null,
    created_at: overrides.created_at ?? nowIso(),
  }
}

// ─── Draft ─────────────────────────────────────────────────────────

export interface MockDraft {
  id: string
  job_id: string
  user_id: string
  channel: MockJobChannel
  content: string
  is_edited: boolean
  is_done: boolean
  is_current: boolean
  version: number
  created_at: string
  updated_at: string
}

export function createMockDraft(overrides: Partial<MockDraft> = {}): MockDraft {
  const ts = nowIso()
  return {
    id: overrides.id ?? nextId(),
    job_id: overrides.job_id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    channel: overrides.channel ?? 'linkedin_post',
    content: overrides.content ?? '🚀 Just shipped our latest feature. Here\'s what we learned along the way...',
    is_edited: overrides.is_edited ?? false,
    is_done: overrides.is_done ?? false,
    is_current: overrides.is_current ?? true,
    version: overrides.version ?? 1,
    created_at: overrides.created_at ?? ts,
    updated_at: overrides.updated_at ?? ts,
  }
}

// ─── Social Account ────────────────────────────────────────────────

export interface MockSocialAccount {
  id: string
  user_id: string
  provider: 'x' | 'facebook'
  external_account_id: string
  display_name: string
  account_type: 'profile' | 'page'
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  scopes: string[]
  token_expires_at: string | null
  created_at: string
  updated_at: string
}

export function createMockSocialAccount(overrides: Partial<MockSocialAccount> = {}): MockSocialAccount {
  const ts = nowIso()
  return {
    id: overrides.id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    provider: overrides.provider ?? 'x',
    external_account_id: overrides.external_account_id ?? `ext-${counter}`,
    display_name: overrides.display_name ?? '@testhandle',
    account_type: overrides.account_type ?? 'profile',
    access_token_encrypted: overrides.access_token_encrypted ?? 'ZW5jcnlwdGVkOnRva2VuLWJhc2U2NA==',
    refresh_token_encrypted: overrides.refresh_token_encrypted ?? 'ZW5jcnlwdGVkOnJlZnJlc2g=',
    scopes: overrides.scopes ?? ['tweet.read', 'tweet.write', 'users.read'],
    token_expires_at: overrides.token_expires_at ?? '2026-12-31T00:00:00Z',
    created_at: overrides.created_at ?? ts,
    updated_at: overrides.updated_at ?? ts,
  }
}

// ─── Publish Attempt ───────────────────────────────────────────────

export interface MockPublishAttempt {
  id: string
  draft_id: string
  user_id: string
  provider: 'x' | 'facebook'
  target_id: string | null
  target_name: string | null
  status: 'draft' | 'publishing' | 'published' | 'failed'
  external_post_id: string | null
  external_post_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export function createMockPublishAttempt(overrides: Partial<MockPublishAttempt> = {}): MockPublishAttempt {
  const ts = nowIso()
  return {
    id: overrides.id ?? nextId(),
    draft_id: overrides.draft_id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    provider: overrides.provider ?? 'x',
    target_id: overrides.target_id ?? null,
    target_name: overrides.target_name ?? null,
    status: overrides.status ?? 'draft',
    external_post_id: overrides.external_post_id ?? null,
    external_post_url: overrides.external_post_url ?? null,
    error_message: overrides.error_message ?? null,
    created_at: overrides.created_at ?? ts,
    updated_at: overrides.updated_at ?? ts,
  }
}

// ─── Extension Task (extension queue) ──────────────────────────────

export interface MockExtensionTask {
  id: string
  user_id: string
  channel: 'facebook' | 'facebook-group' | 'threads' | 'instagram' | 'x'
  content: string
  images: string[]
  scheduled_for: string
  priority: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  target_id: string | null
  target_type: 'profile' | 'page' | 'group' | null
  result_url: string | null
  actor_url: string | null
  actor_name: string | null
  target_name: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export function createMockExtensionTask(overrides: Partial<MockExtensionTask> = {}): MockExtensionTask {
  const ts = nowIso()
  return {
    id: overrides.id ?? nextId(),
    user_id: overrides.user_id ?? nextId(),
    channel: overrides.channel ?? 'facebook',
    content: overrides.content ?? 'Sample post content for the extension to publish.',
    images: overrides.images ?? [],
    scheduled_for: overrides.scheduled_for ?? ts,
    priority: overrides.priority ?? 0,
    status: overrides.status ?? 'pending',
    target_id: overrides.target_id ?? null,
    target_type: overrides.target_type ?? null,
    result_url: overrides.result_url ?? null,
    actor_url: overrides.actor_url ?? null,
    actor_name: overrides.actor_name ?? null,
    target_name: overrides.target_name ?? null,
    error_message: overrides.error_message ?? null,
    created_at: overrides.created_at ?? ts,
    updated_at: overrides.updated_at ?? ts,
  }
}

// ─── Helper: reset counter khi cần deterministic output ────────────

export function resetFactoryCounter(): void {
  counter = 0
}
