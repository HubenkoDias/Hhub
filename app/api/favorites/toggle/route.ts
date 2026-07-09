import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TARGET_TYPES = ['qa', 'company']

export async function POST(req: NextRequest) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Verify the requester's real session token
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || !body.targetId || !body.targetType) {
        return NextResponse.json({ error: 'Missing targetId or targetType' }, { status: 400 })
    }
    const { targetId, targetType } = body

    // 2. Validate targetType
    if (!VALID_TARGET_TYPES.includes(targetType)) {
        return NextResponse.json({ error: `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}` }, { status: 400 })
    }

    // 3. Verify the target profile actually exists
    const table = targetType === 'qa' ? 'qa_profiles' : 'company_profiles'
    const { data: target } = await supabaseAdmin.from(table).select('user_id').eq('user_id', targetId).single()
    if (!target) {
        return NextResponse.json({ error: `${targetType} profile not found` }, { status: 404 })
    }

    // 4. Toggle: if it already exists, remove it; otherwise add it
    const { data: existing } = await supabaseAdmin.from('favorites')
        .select('id').eq('user_id', user.id).eq('target_id', targetId).eq('target_type', targetType).single()

    if (existing) {
        const { error } = await supabaseAdmin.from('favorites').delete().eq('id', existing.id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ favorited: false }, { status: 200 })
    } else {
        const { error } = await supabaseAdmin.from('favorites').insert({ user_id: user.id, target_id: targetId, target_type: targetType })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ favorited: true }, { status: 200 })
    }
}
