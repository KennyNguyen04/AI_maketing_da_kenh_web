import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

/**
 * DELETE /api/vaults/[id]
 * Soft delete a brand vault. The DB row is kept for audit but hidden
 * from user-facing selectors (NewJobForm, /vaults page).
 *
 * Existing repurpose_jobs that reference this vault keep their
 * brand_vault_id (nullable FK) — they will show the orphaned reference
 * but still load correctly. UI surfaces this as "no vault" rather than
 * silently failing.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    const id = assertUuid(rawId, 'vault_id')

    const { data: vault } = await supabase
      .from('brand_vaults')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('brand_vaults')
      .update({ is_deleted: true, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to soft-delete vault:', error)
      return NextResponse.json({ error: 'Failed to delete vault' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('DELETE /api/vaults/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
