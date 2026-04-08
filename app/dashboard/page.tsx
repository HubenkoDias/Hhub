'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { QA_SKILLS, INDUSTRIES, COMPANY_SIZES, AVAIL_LABELS } from '@/lib/types'
import { Upload, Plus, Trash2, CheckCircle, Clock, XCircle, Award, Briefcase, Star } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [role,    setRole]    = useState<string|null>(null)
  const [qa,      setQA]      = useState<any>(null)
  const [co,      setCo]      = useState<any>(null)
  const [certs,   setCerts]   = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [tab,     setTab]     = useState('profile')
  const photoRef = useRef<HTMLInputElement>(null)
  const logoRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
      if (!p) { router.push('/auth/login'); return }
      setRole(p.role)
      // Admin also gets QA profile
      if (p.role === 'qa' || p.role === 'admin') {
        const { data: q } = await supabase.from('qa_profiles').select('*').eq('user_id', data.user.id).single()
        setQA(q || { skills: [], availability: 'freelance', full_name:'', title:'', bio:'', years_experience:0, location:'', linkedin_url:'', github_url:'' })
        if (q) {
          const [{ data: cs }, { data: pf }] = await Promise.all([
            supabase.from('certificates').select('*').eq('qa_profile_id', q.id).order('created_at'),
            supabase.from('portfolio_items').select('*').eq('qa_profile_id', q.id).order('start_date', { ascending: false }),
          ])
          setCerts(cs || [])
          setPortfolio(pf || [])
        }
      }
      if (p.role === 'company') {
        const { data: c } = await supabase.from('company_profiles').select('*').eq('user_id', data.user.id).single()
        setCo(c || { company_name:'', website:'', description:'', industry:'', company_size:'', location:'', contact_email:'' })
      }
      setLoading(false)
    })
  }, [])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const saveQA = async () => {
    setSaving(true)
    const { error } = await supabase.from('qa_profiles').upsert({
      user_id: user.id, full_name: qa.full_name||'', title: qa.title||'', bio: qa.bio||'',
      years_experience: qa.years_experience||0, skills: qa.skills||[], availability: qa.availability||'freelance',
      hourly_rate: qa.hourly_rate||null, location: qa.location||'',
      linkedin_url: qa.linkedin_url||null, github_url: qa.github_url||null,
    }, { onConflict: 'user_id' })
    if (!error && !qa.id) {
      const { data: q } = await supabase.from('qa_profiles').select('id').eq('user_id', user.id).single()
      if (q) setQA((prev: any) => ({ ...prev, id: q.id }))
    }
    setSaving(false); flash()
  }

  const saveCo = async () => {
    setSaving(true)
    await supabase.from('company_profiles').upsert({
      user_id: user.id, company_name: co.company_name||'', website: co.website||null,
      description: co.description||'', industry: co.industry||'', company_size: co.company_size||'',
      location: co.location||'', contact_email: co.contact_email||'',
    }, { onConflict: 'user_id' })
    setSaving(false); flash()
  }

  const uploadPhoto = async (file: File, bucket: string, field: string, setter: any) => {
    if (file.size > 5*1024*1024) { alert('Max 5MB'); return }
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`
    await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    const { data: u } = supabase.storage.from(bucket).getPublicUrl(path)
    setter((prev: any) => ({ ...prev, [field]: u.publicUrl }))
  }

  const toggleSkill = (s: string) => {
    const skills = qa.skills || []
    setQA({ ...qa, skills: skills.includes(s) ? skills.filter((x: string) => x !== s) : [...skills, s] })
  }

  const addCert = () => setCerts([...certs, { _new: true, _id: Date.now(), qa_profile_id: qa?.id, name:'', issuer:'', certificate_id:'', issued_date:'', description:'', image_url: null }])

  const saveCert = async (cert: any, idx: number) => {
    const payload = { qa_profile_id: qa.id, name: cert.name, issuer: cert.issuer, certificate_id: cert.certificate_id, issued_date: cert.issued_date || null, description: cert.description, image_url: cert.image_url }
    if (cert._new) {
      const { data } = await supabase.from('certificates').insert(payload).select().single()
      const arr = [...certs]; arr[idx] = data; setCerts(arr)
    } else {
      await supabase.from('certificates').update(payload).eq('id', cert.id)
    }
  }

  const delCert = async (cert: any, idx: number) => {
    if (!cert._new) await supabase.from('certificates').delete().eq('id', cert.id)
    setCerts(certs.filter((_,i) => i !== idx))
  }

  const addPortfolio = () => setPortfolio([...portfolio, { _new: true, _id: Date.now(), qa_profile_id: qa?.id, title:'', company:'', description:'', skills_used:[], start_date:'', end_date:'', is_current: false }])

  const savePortfolio = async (item: any, idx: number) => {
    const payload = { qa_profile_id: qa.id, title: item.title, company: item.company, description: item.description, skills_used: item.skills_used||[], start_date: item.start_date||null, end_date: item.is_current ? null : (item.end_date||null), is_current: item.is_current }
    if (item._new) {
      const { data } = await supabase.from('portfolio_items').insert(payload).select().single()
      const arr = [...portfolio]; arr[idx] = data; setPortfolio(arr)
    } else {
      await supabase.from('portfolio_items').update(payload).eq('id', item.id)
    }
  }

  const delPortfolio = async (item: any, idx: number) => {
    if (!item._new) await supabase.from('portfolio_items').delete().eq('id', item.id)
    setPortfolio(portfolio.filter((_,i) => i !== idx))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>

  const isQA    = role === 'qa' || role === 'admin'
  const isAdmin = role === 'admin'
  const tabs = isQA
    ? ['profile','certificates','portfolio','settings']
    : ['profile','settings']

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold">My Profile</h1>
              <p className="text-[#0F0F0F]/50 text-sm mt-1">
                {isAdmin ? '👑 Admin & QA Specialist' : role === 'qa' ? 'QA Specialist' : 'Company'} account
              </p>
            </div>
            {isQA && qa && (
              <div>
                {qa.verification_status === 'verified'  && <span className="badge-verified"><CheckCircle size={12}/> Verified</span>}
                {qa.verification_status === 'pending'   && <span className="badge-pending"><Clock size={12}/> Pending review</span>}
                {(!qa.verification_status || qa.verification_status === 'rejected') && (
                  <div>
                    {qa.verification_status === 'rejected' && <span className="badge-rejected mb-1 block"><XCircle size={12}/> Rejected</span>}
                    <p className="text-xs text-[#0F0F0F]/40">{qa.verification_note || 'Complete profile to submit for review'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#D8D4CB] rounded-xl p-1 mb-8 w-fit overflow-x-auto">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 whitespace-nowrap ${tab===t ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#0F0F0F]/60 hover:text-[#0F0F0F]'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* QA PROFILE */}
          {isQA && tab === 'profile' && (
            <div className="space-y-6">
              <div className="card space-y-4">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Profile photo</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-[#EAE7E0] overflow-hidden border border-[#E8E4DC] flex items-center justify-center flex-shrink-0">
                    {qa?.photo_url
                      ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/>
                      : <span style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-[#0F0F0F]/20">{qa?.full_name?.[0]||'?'}</span>
                    }
                  </div>
                  <div>
                    <button onClick={() => photoRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2"><Upload size={14}/> Upload photo</button>
                    <p className="text-xs text-[#0F0F0F]/35 mt-2">JPG, PNG — max 5 MB</p>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f && qa) uploadPhoto(f,'avatars','photo_url',setQA) }}/>
                  </div>
                </div>
              </div>

              <div className="card space-y-4">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Basic information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Full name</label><input className="input" value={qa?.full_name||''} onChange={e => setQA({...qa,full_name:e.target.value})} placeholder="John Smith"/></div>
                  <div><label className="label">Job title</label><input className="input" value={qa?.title||''} onChange={e => setQA({...qa,title:e.target.value})} placeholder="Senior QA Engineer"/></div>
                </div>
                <div><label className="label">Bio</label><textarea className="input resize-none h-28" value={qa?.bio||''} onChange={e => setQA({...qa,bio:e.target.value})} placeholder="Tell companies about your experience and expertise…"/></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Years exp.</label><input type="number" className="input" value={qa?.years_experience||0} onChange={e => setQA({...qa,years_experience:parseInt(e.target.value)||0})} min={0} max={50}/></div>
                  <div><label className="label">Hourly rate ($)</label><input type="number" className="input" value={qa?.hourly_rate||''} onChange={e => setQA({...qa,hourly_rate:parseInt(e.target.value)||null})} placeholder="50"/></div>
                  <div><label className="label">Location</label><input className="input" value={qa?.location||''} onChange={e => setQA({...qa,location:e.target.value})} placeholder="Kyiv, Ukraine"/></div>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(AVAIL_LABELS).map(([v,l]) => (
                      <button key={v} type="button" onClick={() => setQA({...qa,availability:v})}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${qa?.availability===v ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : 'bg-white border-[#D8D4CB] text-[#0F0F0F]/60 hover:border-[#0F0F0F]/40'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">LinkedIn URL</label><input className="input" value={qa?.linkedin_url||''} onChange={e => setQA({...qa,linkedin_url:e.target.value})} placeholder="https://linkedin.com/in/…"/></div>
                  <div><label className="label">GitHub URL</label><input className="input" value={qa?.github_url||''} onChange={e => setQA({...qa,github_url:e.target.value})} placeholder="https://github.com/…"/></div>
                </div>
              </div>

              <div className="card">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Skills & Tools</h2>
                <div className="flex flex-wrap gap-2">
                  {QA_SKILLS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSkill(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-150 ${(qa?.skills||[]).includes(s) ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : 'bg-white border-[#D8D4CB] text-[#0F0F0F]/60 hover:border-[#0F0F0F]/40'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={saveQA} disabled={saving} className="btn-accent">
                {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save profile'}
              </button>
            </div>
          )}

          {/* CERTIFICATES */}
          {isQA && tab === 'certificates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">Certificates</h2>
                  <p className="text-[#0F0F0F]/50 text-sm mt-1">Shown publicly on your profile</p>
                </div>
                <button onClick={addCert} className="btn-primary flex items-center gap-2"><Plus size={16}/> Add</button>
              </div>
              {certs.length === 0 && (
                <div className="card text-center py-12"><Award size={32} className="text-[#0F0F0F]/15 mx-auto mb-3"/><p className="font-mono text-sm text-[#0F0F0F]/35">No certificates yet</p></div>
              )}
              {certs.map((cert, idx) => (
                <CertForm key={cert.id||cert._id} cert={cert} userId={user.id}
                  onChange={u => { const a=[...certs]; a[idx]=u; setCerts(a) }}
                  onSave={() => saveCert(cert, idx)} onDelete={() => delCert(cert, idx)}/>
              ))}
            </div>
          )}

          {/* PORTFOLIO */}
          {isQA && tab === 'portfolio' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">Portfolio & Experience</h2>
                  <p className="text-[#0F0F0F]/50 text-sm mt-1">Add real projects you've worked on</p>
                </div>
                <button onClick={addPortfolio} className="btn-primary flex items-center gap-2"><Plus size={16}/> Add project</button>
              </div>
              {portfolio.length === 0 && (
                <div className="card text-center py-12"><Briefcase size={32} className="text-[#0F0F0F]/15 mx-auto mb-3"/><p className="font-mono text-sm text-[#0F0F0F]/35">No projects yet</p></div>
              )}
              {portfolio.map((item, idx) => (
                <PortfolioForm key={item.id||item._id} item={item}
                  onChange={u => { const a=[...portfolio]; a[idx]=u; setPortfolio(a) }}
                  onSave={() => savePortfolio(item, idx)} onDelete={() => delPortfolio(item, idx)}/>
              ))}
            </div>
          )}

          {/* COMPANY PROFILE */}
          {role === 'company' && tab === 'profile' && co && (
            <div className="space-y-6">
              <div className="card space-y-4">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Company logo</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-[#EAE7E0] overflow-hidden border border-[#E8E4DC] flex items-center justify-center flex-shrink-0">
                    {co?.logo_url ? <img src={co.logo_url} className="w-full h-full object-cover" alt=""/> : <span className="text-2xl">🏢</span>}
                  </div>
                  <div>
                    <button onClick={() => logoRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2"><Upload size={14}/> Upload logo</button>
                    <p className="text-xs text-[#0F0F0F]/35 mt-2">JPG, PNG — max 2 MB</p>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) uploadPhoto(f,'company-logos','logo_url',setCo) }}/>
                  </div>
                </div>
              </div>
              <div className="card space-y-4">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Company information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Company name</label><input className="input" value={co.company_name||''} onChange={e => setCo({...co,company_name:e.target.value})} placeholder="Acme Corp"/></div>
                  <div><label className="label">Website</label><input className="input" value={co.website||''} onChange={e => setCo({...co,website:e.target.value})} placeholder="https://acme.com"/></div>
                </div>
                <div><label className="label">Description</label><textarea className="input resize-none h-28" value={co.description||''} onChange={e => setCo({...co,description:e.target.value})} placeholder="Tell QA specialists about your company…"/></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Industry</label><select className="input" value={co.industry||''} onChange={e => setCo({...co,industry:e.target.value})}><option value="">Select</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
                  <div><label className="label">Company size</label><select className="input" value={co.company_size||''} onChange={e => setCo({...co,company_size:e.target.value})}><option value="">Select</option>{COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}</select></div>
                  <div><label className="label">Location</label><input className="input" value={co.location||''} onChange={e => setCo({...co,location:e.target.value})} placeholder="New York, USA"/></div>
                </div>
                <div><label className="label">Contact email</label><input type="email" className="input" value={co.contact_email||''} onChange={e => setCo({...co,contact_email:e.target.value})} placeholder="hr@company.com"/></div>
              </div>
              <button onClick={saveCo} disabled={saving} className="btn-accent">{saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save profile'}</button>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div className="space-y-4">
              <div className="card space-y-4">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Account settings</h2>
                <div><label className="label">Email</label><input className="input bg-[#EAE7E0]" value={user?.email||''} disabled/></div>
                <div><label className="label">Role</label><input className="input bg-[#EAE7E0] capitalize" value={role||''} disabled/></div>
              </div>
              <div className="card">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Danger zone</h2>
                <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors">
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CertForm({ cert, userId, onChange, onSave, onDelete }: any) {
  const [open, setOpen] = useState(!!cert._new)
  const [saving, setSaving] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  const uploadImg = async (file: File) => {
    if (file.size > 5*1024*1024) { alert('Max 5MB'); return }
    const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`
    const { data } = await supabase.storage.from('certificates').upload(path, file, { upsert: true })
    if (data) { const { data: u } = supabase.storage.from('certificates').getPublicUrl(data.path); onChange({ ...cert, image_url: u.publicUrl }) }
  }

  const handleSave = async () => { setSaving(true); await onSave(); setSaving(false); setOpen(false) }

  return (
    <div className="card border border-[#E8E4DC]">
      <div className="flex justify-between items-start">
        <div className="cursor-pointer flex-1" onClick={() => setOpen(!open)}>
          <p className="font-semibold text-sm">{cert.name || 'New certificate'}</p>
          {cert.issuer && <p className="text-xs text-[#0F0F0F]/45 mt-0.5">{cert.issuer}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-xs text-[#0F0F0F]/35 hover:text-[#0F0F0F] px-2 py-1 transition-colors">{open?'Collapse':'Edit'}</button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1 transition-colors"><Trash2 size={14}/></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-[#EAE7E0] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Certificate name</label><input className="input" value={cert.name} onChange={e => onChange({...cert,name:e.target.value})} placeholder="ISTQB Foundation Level"/></div>
            <div><label className="label">Issuing org.</label><input className="input" value={cert.issuer} onChange={e => onChange({...cert,issuer:e.target.value})} placeholder="ISTQB"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Certificate ID</label><input className="input font-mono" value={cert.certificate_id} onChange={e => onChange({...cert,certificate_id:e.target.value})} placeholder="CTFL-123456"/></div>
            <div><label className="label">Issue date</label><input type="date" className="input" value={cert.issued_date||''} max={new Date().toISOString().split('T')[0]} onChange={e => onChange({...cert,issued_date:e.target.value})}/></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none h-20" value={cert.description} onChange={e => onChange({...cert,description:e.target.value})} placeholder="Brief description…"/></div>
          <div>
            <label className="label">Certificate image</label>
            <div className="flex items-center gap-3">
              {cert.image_url && <img src={cert.image_url} className="w-16 h-12 object-cover rounded-lg border border-[#E8E4DC]" alt="cert"/>}
              <button type="button" onClick={() => imgRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2"><Upload size={14}/> Upload</button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) uploadImg(f) }}/>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving?'Saving…':'Save certificate'}</button>
        </div>
      )}
    </div>
  )
}

function PortfolioForm({ item, onChange, onSave, onDelete }: any) {
  const [open, setOpen] = useState(!!item._new)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { setSaving(true); await onSave(); setSaving(false); setOpen(false) }

  return (
    <div className="card border border-[#E8E4DC]">
      <div className="flex justify-between items-start">
        <div className="cursor-pointer flex-1" onClick={() => setOpen(!open)}>
          <p className="font-semibold text-sm">{item.title || 'New project'}</p>
          {item.company && <p className="text-xs text-[#0F0F0F]/45 mt-0.5">{item.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-xs text-[#0F0F0F]/35 hover:text-[#0F0F0F] px-2 py-1 transition-colors">{open?'Collapse':'Edit'}</button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1 transition-colors"><Trash2 size={14}/></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-[#EAE7E0] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Project title</label><input className="input" value={item.title} onChange={e => onChange({...item,title:e.target.value})} placeholder="E-commerce platform QA"/></div>
            <div><label className="label">Company</label><input className="input" value={item.company} onChange={e => onChange({...item,company:e.target.value})} placeholder="Acme Corp"/></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none h-24" value={item.description} onChange={e => onChange({...item,description:e.target.value})} placeholder="What did you do, what was your impact…"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start date</label><input type="date" className="input" value={item.start_date||''} onChange={e => onChange({...item,start_date:e.target.value})}/></div>
            <div>
              <label className="label">End date</label>
              {item.is_current ? <div className="input bg-[#EAE7E0] text-[#0F0F0F]/40 text-sm">Present</div> : <input type="date" className="input" value={item.end_date||''} onChange={e => onChange({...item,end_date:e.target.value})}/>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={item.is_current} onChange={e => onChange({...item,is_current:e.target.checked})} className="rounded"/>
            <span className="text-sm text-[#0F0F0F]/60">Currently working here</span>
          </label>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving?'Saving…':'Save project'}</button>
        </div>
      )}
    </div>
  )
}
