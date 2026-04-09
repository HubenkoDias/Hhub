'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { QA_SKILLS } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const TYPES = ['full-time','part-time','contract','freelance']

export default function PostJob() {
  const router = useRouter()
  const [user,  setUser]  = useState<any>(null)
  const [busy,  setBusy]  = useState(false)
  const [form,  setForm]  = useState({
    title: '', description: '', requirements: '', skills: [] as string[],
    employment_type: 'full-time', location: '', remote: true,
    salary_min: '', salary_max: '', currency: 'USD',
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
      if (p?.role !== 'company') { router.push('/jobs'); return }
      setUser(session.user)
    })
  }, [])

  const toggleSkill = (s: string) => setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s] }))

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    setBusy(true)
    const { data } = await supabase.from('job_postings').insert({
      company_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      skills: form.skills,
      employment_type: form.employment_type,
      location: form.location.trim() || null,
      remote: form.remote,
      salary_min: parseInt(form.salary_min) || null,
      salary_max: parseInt(form.salary_max) || null,
      currency: form.currency,
      is_active: true,
    }).select().single()
    setBusy(false)
    if (data) router.push(`/jobs/${data.id}`)
  }

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <Link href="/jobs" className="flex items-center gap-2 text-sm text-[#111]/45 hover:text-[#111] mb-6 transition-colors">
            <ArrowLeft size={15}/> Back to jobs
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-8">Post a job</h1>

          <div className="space-y-5">
            <div className="card space-y-4">
              <h2 className="font-semibold">Job details</h2>
              <div><label className="label">Job title *</label><input className="input" value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="QA Engineer, Senior Test Automation Lead…"/></div>
              <div><label className="label">Description *</label><textarea className="input resize-none h-32" value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Describe the role, responsibilities, and what you're looking for…"/></div>
              <div><label className="label">Requirements</label><textarea className="input resize-none h-24" value={form.requirements} onChange={e => setForm({...form,requirements:e.target.value})} placeholder="Specific requirements, nice-to-haves…"/></div>
            </div>

            <div className="card space-y-4">
              <h2 className="font-semibold">Role type & location</h2>
              <div>
                <label className="label">Employment type</label>
                <div className="flex gap-2 flex-wrap">
                  {TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm({...form,employment_type:t})}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-all ${form.employment_type===t ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="New York, USA"/></div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.remote} onChange={e => setForm({...form,remote:e.target.checked})} className="rounded"/>
                    <span className="text-sm font-medium">Remote OK</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Min salary</label><input type="number" className="input" value={form.salary_min} onChange={e => setForm({...form,salary_min:e.target.value})} placeholder="3000"/></div>
                <div><label className="label">Max salary</label><input type="number" className="input" value={form.salary_max} onChange={e => setForm({...form,salary_max:e.target.value})} placeholder="6000"/></div>
                <div><label className="label">Currency</label>
                  <div className="select-wrap">
                    <select className="input" value={form.currency} onChange={e => setForm({...form,currency:e.target.value})}>
                      <option>USD</option><option>EUR</option><option>GBP</option><option>UAH</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-3">Required skills</h2>
              <div className="flex flex-wrap gap-2">
                {QA_SKILLS.map(s => (
                  <button key={s} type="button" onClick={() => toggleSkill(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${form.skills.includes(s) ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={submit} disabled={busy || !form.title.trim() || !form.description.trim()} className="btn-accent w-full justify-center disabled:opacity-50">
              {busy ? 'Publishing…' : 'Publish job posting'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
