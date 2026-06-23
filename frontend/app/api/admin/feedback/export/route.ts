import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { data } = await supabaseAdmin
    .from('alpha_feedback')
    .select('id, user_id, rating, category, message, created_at')
    .order('created_at', { ascending: false })

  const header = ['id', 'user_id', 'rating', 'category', 'message', 'created_at']
  const rows = (data || []).map((item) => header.map((key) => csvEscape(item[key as keyof typeof item])).join(','))
  const csv = [header.join(','), ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="amplify-alpha-feedback.csv"',
    },
  })
}
