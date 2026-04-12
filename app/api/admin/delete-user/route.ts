import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { userId, requesterId } = await req.json()
  if (!userId || !requesterId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify requester is admin
  const { data: prof } = await supabaseAdmin.from('profiles').select('role').eq('user_id', requesterId).single()
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Can't delete yourself
  if (userId === requesterId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  try {
    // Delete from auth.users - this cascades via FK to profiles, qa_profiles, company_profiles etc.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
