import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const TITLE_MIN = 5
const TITLE_MAX = 150
const DESCRIPTION_MIN = 20
const DESCRIPTION_MAX = 5000
const VALID_EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'freelance']
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'UAH']

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

    // 2. Verify the requester actually has the "company" role
    const { data: prof } = await supabaseAdmin.from('profiles').select('role').eq('user_id', user.id).single()
    if (prof?.role !== 'company') {
        return NextResponse.json({ error: 'Only company accounts can post jobs' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const {
        title, description, requirements, skills,
        employment_type, location, remote,
        salary_min, salary_max, currency,
    } = body

    // 3. Server-side validation - the client-side checks in the UI can always
    //    be bypassed by calling this endpoint directly, so every rule that
    //    matters must also be enforced here.
    const errors: string[] = []

    const trimmedTitle = typeof title === 'string' ? title.trim() : ''
    if (trimmedTitle.length < TITLE_MIN || trimmedTitle.length > TITLE_MAX) {
        errors.push(`Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`)
    }

    const trimmedDescription = typeof description === 'string' ? description.trim() : ''
    if (trimmedDescription.length < DESCRIPTION_MIN || trimmedDescription.length > DESCRIPTION_MAX) {
        errors.push(`Description must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters`)
    }

    if (!VALID_EMPLOYMENT_TYPES.includes(employment_type)) {
        errors.push(`employment_type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`)
    }

    if (currency !== undefined && currency !== null && !VALID_CURRENCIES.includes(currency)) {
        errors.push(`currency must be one of: ${VALID_CURRENCIES.join(', ')}`)
    }

    const minSalary = salary_min !== '' && salary_min !== null && salary_min !== undefined ? Number(salary_min) : null
    const maxSalary = salary_max !== '' && salary_max !== null && salary_max !== undefined ? Number(salary_max) : null

    if (minSalary !== null && (!Number.isFinite(minSalary) || minSalary < 0)) {
        errors.push('salary_min must be a positive number')
    }
    if (maxSalary !== null && (!Number.isFinite(maxSalary) || maxSalary < 0)) {
        errors.push('salary_max must be a positive number')
    }
    if (minSalary !== null && maxSalary !== null && minSalary > maxSalary) {
        errors.push('salary_min cannot be greater than salary_max')
    }

    if (errors.length > 0) {
        return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    // 4. Insert using the verified user id - never trust a company_id sent by the client
    const { data, error } = await supabaseAdmin.from('job_postings').insert({
        company_id: user.id,
        title: trimmedTitle,
        description: trimmedDescription,
        requirements: typeof requirements === 'string' && requirements.trim() ? requirements.trim() : null,
        skills: Array.isArray(skills) ? skills : [],
        employment_type,
        location: typeof location === 'string' && location.trim() ? location.trim() : null,
        remote: !!remote,
        salary_min: minSalary,
        salary_max: maxSalary,
        currency: currency || 'USD',
        is_active: true,
        applications_count: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
}
