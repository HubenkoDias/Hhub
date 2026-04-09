'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Building2, Plus, SlidersHorizontal, X } from 'lucide-react'
import { QA_SKILLS } from '@/lib/types'

const TYPES = ['full-time','part-time','contract','freelance']

export default function Jobs() {
  const [jobs,    setJobs]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user,    setUser]    = useState<any>(null)
  const [role,    setRole]    = useState<string|null>(null)
  const [showF,   setShowF]   = useState(false)
  const [search,  setSearch]  = useState('')
  const [type,    setType]    = useState('')
  const [remote,  setRemote]  = useState<boolean|null>(null)
  const [companies, setCompanies] = useState<Record<string,any>>({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
        if (p) setRole(p.role)
      }
    })
    load()
  }, [])

  useEffect(() => { load() }, [type, remote, search])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('job_postings').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (type)   q = q.eq('employment_type', type)
    if (remote !== null) q = q.eq('remote', remote)
    const { data } = await q
    const jobs = data || []
    setJobs(jobs)

    // Fetch company profiles
    const companyIds = [...new Set(jobs.map(j => j.company_id))]
    if (companyIds.length > 0) {
      const { data: cos } = await supabase.from('company_profiles').select('user_id,company_name,logo_url,industry').in('user_id', companyIds)
      const map: Record<string,any> = {}
      cos?.forEach(c => { map[c.user_id] = c })
      setCompanies(map)
    }
    setLoading(false)
  }

  const filtered = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
    companies[j.company_id]?.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="bg-[#0A0A0A] py-16">
          <div className="max-w-7xl mx-auto px-6 flex items-end justify-between">
            <div>
              <p className="section-tag text-white/35 mb-3">Find work</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">QA Job Board</h1>
              <p className="text-white/45 mt-2 text-sm">Quality assurance roles from verified companies</p>
            </div>
            {role === 'company' && (
              <Link href="/jobs/post" className="btn-accent">+ Post a job</Link>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search + filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <input className="input flex-1 min-w-48" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs or companies…"/>
            <button onClick={() => setShowF(!showF)} className={`btn-secondary flex items-center gap-2 ${showF ? 'bg-[#111] text-white border-[#111]' : ''}`}>
              <SlidersHorizontal size={15}/> Filters
            </button>
          </div>
          {showF && (
            <div className="card mb-6 flex flex-wrap gap-4 items-end animate-fade-in">
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setType(type === t ? '' : t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${type === t ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Work mode</label>
                <div className="flex gap-2">
                  {[['Remote', true], ['On-site', false]].map(([l, v]) => (
                    <button key={String(v)} onClick={() => setRemote(remote === v ? null : v as boolean)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${remote === v ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {(type || remote !== null) && (
                <button onClick={() => { setType(''); setRemote(null) }} className="flex items-center gap-1 text-xs text-[#111]/45 hover:text-[#111]">
                  <X size={12}/> Clear
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#111]/35">
              <p className="text-sm font-mono">No jobs found</p>
              {role === 'company' && <Link href="/jobs/post" className="btn-primary mt-4 inline-flex">Post the first job</Link>}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(j => {
                const co = companies[j.company_id]
                return (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="card-hover block">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {co?.logo_url ? <img src={co.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={20} className="text-[#111]/25"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base">{j.title}</h3>
                        <p className="text-sm text-[#111]/50">{co?.company_name || 'Company'}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#111]/40">
                          {j.location && <span className="flex items-center gap-1"><MapPin size={11}/>{j.location}</span>}
                          {j.remote && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/>Remote</span>}
                          {j.employment_type && <span className="flex items-center gap-1 capitalize"><Clock size={11}/>{j.employment_type}</span>}
                          {(j.salary_min || j.salary_max) && (
                            <span className="flex items-center gap-1"><DollarSign size={11}/>
                              {j.salary_min && j.salary_max ? `$${j.salary_min}–$${j.salary_max}` : j.salary_min ? `From $${j.salary_min}` : `Up to $${j.salary_max}`}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {(j.skills || []).slice(0, 5).map((s: string) => <span key={s} className="skill-pill">{s}</span>)}
                          {(j.skills || []).length > 5 && <span className="skill-pill">+{j.skills.length - 5}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[#111]/30 font-mono">{new Date(j.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</p>
                        {j.applications_count > 0 && <p className="text-xs text-[#111]/40 mt-1">{j.applications_count} applicants</p>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Footer/>
    </>
  )
}
