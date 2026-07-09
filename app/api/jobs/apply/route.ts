import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    // 2. Verify the requester has the "qa" role - only QA specialists can apply
    const { data: prof } = await supabaseAdmin.from('profiles').select('role').eq('user_id', user.id).single()
    if (prof?.role !== 'qa') {
        return NextResponse.json({ error: 'Only QA specialists can apply to jobs' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    if (!body || !body.jobId) {
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }
    const { jobId, coverLetter } = body

    // 3. Verify the job actually exists
    const { data: job } = await supabaseAdmin.from('job_postings').select('id, title, company_id, applications_count').eq('id', jobId).single()
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // 4. Prevent duplicate applications
    const { data: existing } = await supabaseAdmin.from('job_applications')
        .select('id').eq('job_id', jobId).eq('applicant_id', user.id).single()
    if (existing) {
        return NextResponse.json({ error: 'You have already applied to this job' }, { status: 400 })
    }

    // 5. Create the application, bump the counter, and notify the company
    const { error: insertError } = await supabaseAdmin.from('job_applications').insert({
        job_id: jobId,
        applicant_id: user.id,
        cover_letter: typeof coverLetter === 'string' && coverLetter.trim() ? coverLetter.trim() : null,
    })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await supabaseAdmin.from('job_postings').update({ applications_count: (job.applications_count || 0) + 1 }).eq('id', jobId)
    await supabaseAdmin.from('notifications').insert({
        user_id: job.company_id,
        type: 'job_application',
        title: 'New application!',
        message: `Someone applied to "${job.title}"`,
        link: `/jobs/${jobId}`,
    })

    return NextResponse.json({ success: true }, { status: 201 })
}
