import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Very small in-memory rate limiter (per server instance).
// Note: on serverless platforms like Vercel this resets on cold start
// and is not shared across instances - it's a basic safety net, not a
// production-grade rate limiter (that would need Redis/Upstash).
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 5
const requestLog = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(key) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  requestLog.set(key, timestamps)
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
  }

  const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Extract and validate the requester's real session token from the
  //    Authorization header - never trust a "requesterId" sent in the body,
  //    since that can be forged by anyone.
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !requester) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  // 2. Verify the authenticated requester is actually an admin (using their
  //    real, verified id - not one they claimed in the body).
  const { data: prof } = await supabaseAdmin.from('profiles').select('role').eq('user_id', requester.id).single()
  if (prof?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 3. Can't delete yourself
  if (userId === requester.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  try {
    // Delete from auth.users - this cascades via FK to profiles, qa_profiles, company_profiles etc.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
