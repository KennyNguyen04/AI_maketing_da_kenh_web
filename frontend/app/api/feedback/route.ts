'use server'

import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

interface FeedbackPayload {
  feedback_type: string
  message: string
  rating?: number
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const body: FeedbackPayload = await request.json()
    const { feedback_type, message, rating, metadata } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5000 characters)' }, { status: 400 })
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const insertData = {
      feedback_type: feedback_type || 'general',
      message: message.trim(),
      rating: rating || null,
      metadata: metadata || null,
      user_id: user?.id || null,
    }

    const { data, error } = await supabase
      .from('alpha_feedback')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('Feedback insert error:', error)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('Feedback API error:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
