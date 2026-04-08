import { createServerSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { userId, requesterId } = await req.json()

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', requesterId).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Delete from auth.users — cascades to profiles, qa_profiles, company_profiles, messages etc.
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
