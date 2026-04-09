'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Building2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function JobDetail() {
  const { jobId } = useParams() as { jobId: string }
  const router    = useRouter()
  const [job,     setJob]     = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [user,    setUser]    = useState<any>(null)
  const [role,    setRole]    = useState<string|null>(null)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [cover,   setCover]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
        if (p) setRole(p.role)
        // Check if already applied
        const { data: app } = await supabase.from('job_applications').select('id').eq('job_id', jobId).eq('applicant_id', session.user.id).single()
        if (app) setApplied(true)
      }
    })
    supabase.from('job_postings').select('*').eq('id', jobId).single().then(async ({ data }) => {
      if (!data) { setLoading(false); return }
      setJob(data)
      const { data: co } = await supabase.from('company_profiles').select('*').eq('user_id', data.company_id).single()
      setCompany(co)
      setLoading(false)
    })
  }, [jobId])

  const apply = async () => {
    if (!user) { router.push('/auth/login'); return }
    setApplying(true)
    await supabase.from('job_applications').insert({
      job_id: jobId, applicant_id: user.id, cover_letter: cover.trim() || null
    })
    await supabase.from('job_postings').update({ applications_count: (job.applications_count || 0) + 1 }).eq('id', jobId)
    // Notify company
    await supabase.from('notifications').insert({
      user_id: job.company_id, type: 'job_application',
      title: 'New application!', message: `Someone applied to "${job.title}"`, link: `/jobs/${jobId}`
    })
    setApplied(true); setApplying(false); setShowForm(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin"/></div>
  if (!job) return <><Navbar/><div className="min-h-screen pt-14 flex items-center justify-center"><p className="text-[#111]/40">Job not found</p></div></>

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/jobs" className="flex items-center gap-2 text-sm text-[#111]/45 hover:text-[#111] mb-6 transition-colors">
            <ArrowLeft size={15}/> All jobs
          </Link>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              {/* Header */}
              <div className="card">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {company?.logo_url ? <img src={company.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={22} className="text-[#111]/25"/>}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                    <Link href={`/companies/${job.company_id}`} className="text-[#111]/55 hover:text-[#C8473A] transition-colors">
                      {company?.company_name || 'Company'}
                    </Link>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[#111]/50">
                  {job.location   && <span className="flex items-center gap-1"><MapPin size={13}/>{job.location}</span>}
                  {job.remote     && <span className="flex items-center gap-1 text-emerald-700 font-medium">● Remote</span>}
                  {job.employment_type && <span className="flex items-center gap-1 capitalize"><Clock size={13}/>{job.employment_type}</span>}
                  {(job.salary_min || job.salary_max) && (
                    <span className="flex items-center gap-1"><DollarSign size={13}/>
                      {job.salary_min && job.salary_max ? `$${job.salary_min}–$${job.salary_max}` : job.salary_min ? `From $${job.salary_min}` : `Up to $${job.salary_max}`}/{job.currency || 'USD'}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="card">
                <h2 className="font-semibold mb-3">About the role</h2>
                <p className="text-sm text-[#111]/70 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.requirements && (
                <div className="card">
                  <h2 className="font-semibold mb-3">Requirements</h2>
                  <p className="text-sm text-[#111]/70 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}

              {(job.skills || []).length > 0 && (
                <div className="card">
                  <h2 className="font-semibold mb-3">Skills required</h2>
                  <div className="flex flex-wrap gap-2">{job.skills.map((s: string) => <span key={s} className="skill-pill">{s}</span>)}</div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card">
                {applied ? (
                  <div className="text-center py-2">
                    <CheckCircle size={28} className="text-emerald-500 mx-auto mb-2"/>
                    <p className="font-semibold text-sm">Application sent!</p>
                    <p className="text-xs text-[#111]/45 mt-1">The company will review it soon</p>
                  </div>
                ) : role === 'qa' || role === 'admin' ? (
                  showForm ? (
                    <div className="space-y-3">
                      <label className="label">Cover letter <span className="text-[#111]/35 normal-case font-normal">(optional)</span></label>
                      <textarea className="input resize-none h-28" value={cover} onChange={e => setCover(e.target.value)} placeholder="Why are you a good fit for this role?"/>
                      <button onClick={apply} disabled={applying} className="btn-primary w-full justify-center">
                        {applying ? 'Sending…' : 'Submit application'}
                      </button>
                      <button onClick={() => setShowForm(false)} className="btn-secondary w-full justify-center text-sm">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowForm(true)} className="btn-accent w-full justify-center">Apply now</button>
                  )
                ) : !user ? (
                  <Link href="/auth/login" className="btn-accent w-full justify-center text-center block">Log in to apply</Link>
                ) : (
                  <p className="text-sm text-center text-[#111]/45">Only QA specialists can apply</p>
                )}
              </div>

              {company && (
                <div className="card">
                  <h3 className="font-semibold text-sm mb-3">About the company</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {company.logo_url ? <img src={company.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={16} className="text-[#111]/25"/>}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{company.company_name}</p>
                      {company.industry && <p className="text-xs text-[#111]/45">{company.industry}</p>}
                    </div>
                  </div>
                  <Link href={`/companies/${job.company_id}`} className="text-xs text-[#C8473A] hover:underline">View company profile →</Link>
                </div>
              )}

              <div className="card text-xs text-[#111]/40 space-y-1">
                <p>Posted: {new Date(job.created_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}</p>
                {job.applications_count > 0 && <p>{job.applications_count} applicant{job.applications_count !== 1 ? 's' : ''}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
