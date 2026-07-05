import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReviewClient } from '@/features/review/components/ReviewClient'
import { JobFailedState } from '@/features/review/components/JobFailedState'

export default async function ReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { jobId } = await params

  const { data: job, error: jobError } = await supabase
    .from('repurpose_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (jobError || !job) {
    redirect('/dashboard')
  }

  if (job.status === 'failed') {
    return <JobFailedState job={job} />
  }

  const { data: drafts } = await supabase
    .from('drafts')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .eq('is_current', true)
    .eq('is_deleted', false)

  return <ReviewClient job={job} initialDrafts={drafts || []} />
}
