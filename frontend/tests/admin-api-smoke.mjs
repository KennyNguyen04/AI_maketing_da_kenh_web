/**
 * Admin API Smoke Test (manual)
 *
 * Script này giả lập admin đăng nhập, lấy session cookie,
 * rồi gọi tất cả admin API để xác nhận chúng trả về data thực.
 *
 * Cách dùng:
 *   1. Đảm bảo frontend dev server đang chạy (npm run dev)
 *   2. Set env:
 *        ADMIN_EMAIL=admin@example.com
 *        ADMIN_PASSWORD=xxx
 *        FRONTEND_URL=http://localhost:3000
 *   3. node tests/admin-api-smoke.mjs
 *
 * Script sẽ in ra từng API call + status + summary, kèm đánh giá PASS/FAIL.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD env vars')
  process.exit(1)
}

let cookies = ''
let accessToken = ''
let refreshToken = ''

async function http(path, opts = {}) {
  const res = await fetch(`${FRONTEND_URL}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      cookie: cookies,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    redirect: 'manual',
  })

  const setCookies = res.headers.getSetCookie?.() || []
  for (const c of setCookies) {
    const [pair] = c.split(';')
    if (!cookies.includes(pair.split('=')[0])) {
      cookies += pair + '; '
    }
  }
  return res
}

function row(label, value, ok) {
  const icon = ok ? '✅' : '❌'
  console.log(`${icon} ${label.padEnd(40)} ${value}`)
}

async function login() {
  console.log('\n═══ STEP 1: Login as admin ═══')
  // First, get anon session (creates cookie store)
  const anon = await fetch(`${FRONTEND_URL}/api/health`, { redirect: 'manual' })
  for (const c of anon.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';')
    cookies += pair + '; '
  }

  // Login via Supabase auth API directly (no need to navigate UI)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL required')
    process.exit(1)
  }

  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })

  if (!loginRes.ok) {
    console.error('❌ Login failed:', await loginRes.text())
    process.exit(1)
  }

  const session = await loginRes.json()
  accessToken = session.access_token
  refreshToken = session.refresh_token

  // Sync the SSR cookies so middleware sees the session
  const syncRes = await fetch(`${FRONTEND_URL}/api/health`, {
    headers: {
      cookie: cookies,
      authorization: `Bearer ${accessToken}`,
    },
  })
  for (const c of syncRes.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';')
    const key = pair.split('=')[0]
    // Replace existing cookie of same name
    cookies = cookies.replace(new RegExp(`${key}=[^;]*;?\\s*`), '') + pair + '; '
  }

  row('Login', session.user.email, true)
  row('User plan', session.user.app_metadata?.user_plan || session.user.user_metadata?.user_plan || 'unknown')
  row('Access token length', accessToken.length)
}

async function checkEndpoint(path, opts = {}, checks = {}) {
  const res = await http(path, opts)
  let body
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

async function main() {
  await login()

  console.log('\n═══ STEP 2: Smoke-test admin APIs ═══')

  // /api/admin/stats
  {
    const r = await checkEndpoint('/api/admin/stats')
    const totalUsers = r.body?.users?.total ?? 0
    const totalJobs = r.body?.jobs?.total ?? 0
    const totalPosts = r.body?.posts?.total ?? 0
    const totalVaults = r.body?.vaults?.total ?? 0
    row('/api/admin/stats', `status=${r.status}`)
    row('  → users', totalUsers, totalUsers > 0)
    row('  → jobs', totalJobs, totalJobs >= 0)
    row('  → posts', totalPosts, totalPosts >= 0)
    row('  → vaults', totalVaults, totalVaults >= 0)
    if (r.status !== 200) console.log('   body:', JSON.stringify(r.body))
  }

  // /api/admin/users
  {
    const r = await checkEndpoint('/api/admin/users')
    const users = r.body?.users || []
    row('/api/admin/users', `status=${r.status}, count=${users.length}`)
    if (users.length > 0) {
      const sample = users[0]
      row('  → first user email', sample.email)
      row('  → first user total_jobs', sample.total_jobs)
    }
    if (r.status !== 200) console.log('   body:', JSON.stringify(r.body))
  }

  // /api/admin/jobs (all)
  {
    const r = await checkEndpoint('/api/admin/jobs?status=all')
    const jobs = r.body?.jobs || []
    row('/api/admin/jobs?status=all', `status=${r.status}, count=${jobs.length}`)
    if (jobs.length > 0) {
      const sample = jobs[0]
      row('  → first job title', sample.title || '(no title)')
      row('  → first job user_email', sample.user_email || sample.user_name || '(none)')
      // Verify NO sensitive columns leaked
      const hasSensitive = 'source_content' in sample || 'error_message' in sample
      row('  → no sensitive columns leaked', !hasSensitive)
    }
    if (r.status !== 200) console.log('   body:', JSON.stringify(r.body))
  }

  // /api/admin/jobs/failed
  {
    const r = await checkEndpoint('/api/admin/jobs/failed')
    const jobs = r.body?.jobs || []
    row('/api/admin/jobs/failed', `status=${r.status}, count=${jobs.length}`)
    if (r.status !== 200) console.log('   body:', JSON.stringify(r.body))
  }

  // /api/admin/users/[id] — pick a non-admin user
  {
    const list = await checkEndpoint('/api/admin/users')
    const target = (list.body?.users || []).find((u) => u.user_plan !== 'admin')
    if (!target) {
      row('/api/admin/users/[id]', 'no non-admin user to test', false)
    } else {
      const r = await checkEndpoint(`/api/admin/users/${target.id}`)
      const hasProfile = !!r.body?.profile
      const hasJobs = Array.isArray(r.body?.jobs)
      const hasVaults = Array.isArray(r.body?.vaults)
      row('/api/admin/users/[id]', `status=${r.status}, target=${target.email}`)
      row('  → has profile', hasProfile)
      row('  → has jobs[]', hasJobs)
      row('  → has vaults[]', hasVaults)
      if (r.status !== 200) console.log('   body:', JSON.stringify(r.body))
    }
  }

  // /api/admin/users/[id] with malformed UUID
  {
    const r = await checkEndpoint('/api/admin/users/not-a-uuid')
    row('/api/admin/users/[malformed]', `status=${r.status}`)
    row('  → rejects with 400', r.status === 400)
    if (r.status !== 400 && r.status !== 200) {
      console.log('   body:', JSON.stringify(r.body))
    }
  }

  console.log('\n═══ DONE ═══')
}

main().catch((e) => {
  console.error('💥 script crashed:', e)
  process.exit(1)
})