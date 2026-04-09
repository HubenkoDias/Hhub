'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { QA_SKILLS, INDUSTRIES, COMPANY_SIZES, AVAIL_LABELS } from '@/lib/types'
import { Upload, Plus, Trash2, CheckCircle, Clock, XCircle, Award, Briefcase } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [user,      setUser]      = useState<any>(null)
  const [role,      setRole]      = useState<string | null>(null)
  const [qa,        setQA]        = useState<any>(null)
  const [co,        setCo]        = useState<any>(null)
  const [certs,     setCerts]     = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [tab,       setTab]       = useState('profile')
  const photoRef = useRef<HTMLInputElement>(null)
  const logoRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) setTab(hash)
  }, [])

  const changeTab = (t: string) => {
    setTab(t)
    window.history.replaceState(null, '', `#${t}`)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Not logged in → login page
      if (!session?.user) { router.push('/auth/login'); return }

      const u = session.user
      setUser(u)

      // Get role from profiles table
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', u.id)
        .single()

      // If no profile row yet — stay on page, show empty state
      if (!prof) {
        setRole('qa')
        setQA({ skills: [], availability: 'freelance', full_name: '', title: '', bio: '', years_experience: 0, location: '', linkedin_url: '', github_url: '' })
        setLoading(false)
        return
      }

      setRole(prof.role)

      if (prof.role === 'qa' || prof.role === 'admin') {
        const { data: q } = await supabase
          .from('qa_profiles')
          .select('*')
          .eq('user_id', u.id)
          .single()

        setQA(q || {
          skills: [], availability: 'freelance',
          full_name: '', title: '', bio: '',
          years_experience: 0, location: '',
          linkedin_url: '', github_url: '',
        })

        if (q?.id) {
          const [{ data: cs }, { data: pf }] = await Promise.all([
            supabase.from('certificates').select('*').eq('qa_profile_id', q.id).order('created_at'),
            supabase.from('portfolio_items').select('*').eq('qa_profile_id', q.id).order('start_date', { ascending: false }),
          ])
          setCerts(cs || [])
          setPortfolio(pf || [])
        }
      }

      if (prof.role === 'company') {
        const { data: c } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('user_id', u.id)
          .single()
        setCo(c || {})
      }

      setLoading(false)
    })
  }, [])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Only JPG, PNG, WebP or GIF'); return null
    }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return null }
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error || !data) { alert('Upload failed: ' + error?.message); return null }
    const { data: u } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return u.publicUrl
  }

  const saveQA = async () => {
    setSaving(true)
    await supabase.from('qa_profiles').upsert({
      user_id: user.id,
      full_name: qa.full_name || '',
      title: qa.title || '',
      bio: qa.bio || '',
      years_experience: qa.years_experience || 0,
      skills: qa.skills || [],
      availability: qa.availability || 'freelance',
      hourly_rate: qa.hourly_rate || null,
      location: qa.location || '',
      linkedin_url: qa.linkedin_url || null,
      github_url: qa.github_url || null,
      is_public: true,
    }, { onConflict: 'user_id' })

    // Reload to get id if new
    if (!qa?.id) {
      const { data: q } = await supabase.from('qa_profiles').select('id').eq('user_id', user.id).single()
      if (q) setQA((prev: any) => ({ ...prev, id: q.id }))
    }
    setSaving(false)
    flash()
  }

  const saveCo = async () => {
    setSaving(true)
    await supabase.from('company_profiles').upsert({
      user_id: user.id,
      company_name: co.company_name || '',
      website: co.website || null,
      description: co.description || '',
      industry: co.industry || '',
      company_size: co.company_size || '',
      location: co.location || '',
      contact_email: co.contact_email || '',
    }, { onConflict: 'user_id' })
    setSaving(false)
    flash()
  }

  const toggleSkill = (s: string) => {
    const skills = qa.skills || []
    setQA({ ...qa, skills: skills.includes(s) ? skills.filter((x: string) => x !== s) : [...skills, s] })
  }

  const addCert = () => {
    if (!qa?.id) { alert('Save your profile first'); return }
    setCerts([...certs, { _new: true, _id: Date.now(), qa_profile_id: qa.id, name: '', issuer: '', certificate_id: '', issued_date: '', description: '', image_url: null }])
  }

  const saveCert = async (cert: any, idx: number) => {
    const payload = {
      qa_profile_id: qa.id, name: cert.name, issuer: cert.issuer,
      certificate_id: cert.certificate_id, issued_date: cert.issued_date || null,
      description: cert.description, image_url: cert.image_url,
    }
    if (cert._new) {
      const { data } = await supabase.from('certificates').insert(payload).select().single()
      const arr = [...certs]; arr[idx] = data; setCerts(arr)
    } else {
      await supabase.from('certificates').update(payload).eq('id', cert.id)
    }
  }

  const delCert = async (cert: any, idx: number) => {
    if (!cert._new) await supabase.from('certificates').delete().eq('id', cert.id)
    setCerts(certs.filter((_, i) => i !== idx))
  }

  const addPortfolio = () => {
    if (!qa?.id) { alert('Save your profile first'); return }
    setPortfolio([...portfolio, { _new: true, _id: Date.now(), qa_profile_id: qa.id, title: '', company: '', description: '', skills_used: [], start_date: '', end_date: '', is_current: false }])
  }

  const savePortfolio = async (item: any, idx: number) => {
    const payload = {
      qa_profile_id: qa.id, title: item.title, company: item.company,
      description: item.description, skills_used: item.skills_used || [],
      start_date: item.start_date || null,
      end_date: item.is_current ? null : (item.end_date || null),
      is_current: item.is_current,
    }
    if (item._new) {
      const { data } = await supabase.from('portfolio_items').insert(payload).select().single()
      const arr = [...portfolio]; arr[idx] = data; setPortfolio(arr)
    } else {
      await supabase.from('portfolio_items').update(payload).eq('id', item.id)
    }
  }

  const delPortfolio = async (item: any, idx: number) => {
    if (!item._new) await supabase.from('portfolio_items').delete().eq('id', item.id)
    setPortfolio(portfolio.filter((_, i) => i !== idx))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin" />
    </div>
  )

  const isQA   = role === 'qa' || role === 'admin'
  const tabs   = isQA ? ['profile', 'certificates', 'portfolio', 'settings'] : ['profile', 'settings']

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="max-w-3xl mx-auto px-6 py-10">

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
              <p className="text-sm text-[#111]/45 mt-0.5">
                {role === 'admin' ? 'Admin & QA' : role === 'qa' ? 'QA Specialist' : 'Company'}
              </p>
            </div>
            {isQA && qa && (
              <div>
                {qa.verification_status === 'verified' && <span className="badge-verified"><CheckCircle size={11} /> Verified</span>}
                {qa.verification_status === 'pending'  && <span className="badge-pending"><Clock size={11} /> Pending review</span>}
                {qa.verification_status === 'rejected' && <span className="badge-rejected"><XCircle size={11} /> Rejected</span>}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 bg-[#E8E6E1] rounded-lg p-0.5 mb-8 w-fit">
            {tabs.map(t => (
              <button key={t} onClick={() => changeTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150 ${tab === t ? 'bg-white text-[#111] shadow-sm' : 'text-[#111]/50 hover:text-[#111]/80'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* ── QA PROFILE ── */}
          {isQA && tab === 'profile' && qa && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <h2 className="font-semibold text-base">Profile photo</h2>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl bg-[#E8E6E1] overflow-hidden border border-[#E0DDD8] flex-shrink-0 flex items-center justify-center">
                    {qa.photo_url
                      ? <img src={qa.photo_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-2xl font-bold text-[#111]/20">{qa.full_name?.[0] || '?'}</span>
                    }
                  </div>
                  <div>
                    <button onClick={() => photoRef.current?.click()} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                      <Upload size={13} /> Upload photo
                    </button>
                    <p className="text-xs text-[#111]/35 mt-1.5">JPG, PNG — max 5 MB</p>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        const url = await uploadFile(f, 'avatars')
                        if (url) {
                          setQA({ ...qa, photo_url: url })
                          await supabase.from('qa_profiles').upsert({ user_id: user.id, photo_url: url, is_public: true }, { onConflict: 'user_id' })
                        }
                      }} />
                  </div>
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="font-semibold text-base">Basic info</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" value={qa.full_name || ''} onChange={e => setQA({ ...qa, full_name: e.target.value })} placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="label">Job title</label>
                    <input className="input" value={qa.title || ''} onChange={e => setQA({ ...qa, title: e.target.value })} placeholder="Senior QA Engineer" />
                  </div>
                </div>
                <div>
                  <label className="label">Bio</label>
                  <textarea className="input resize-none h-24" value={qa.bio || ''} onChange={e => setQA({ ...qa, bio: e.target.value })} placeholder="Tell companies about yourself…" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Years exp.</label>
                    <input type="number" className="input" value={qa.years_experience || 0} onChange={e => setQA({ ...qa, years_experience: parseInt(e.target.value) || 0 })} min={0} max={50} />
                  </div>
                  <div>
                    <label className="label">Rate ($/hr)</label>
                    <input type="number" className="input" value={qa.hourly_rate || ''} onChange={e => setQA({ ...qa, hourly_rate: parseInt(e.target.value) || null })} placeholder="50" />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" value={qa.location || ''} onChange={e => setQA({ ...qa, location: e.target.value })} placeholder="Kyiv, Ukraine" />
                  </div>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(AVAIL_LABELS).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setQA({ ...qa, availability: v })}
                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${qa.availability === v ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">LinkedIn</label>
                    <input className="input" value={qa.linkedin_url || ''} onChange={e => setQA({ ...qa, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" />
                  </div>
                  <div>
                    <label className="label">GitHub</label>
                    <input className="input" value={qa.github_url || ''} onChange={e => setQA({ ...qa, github_url: e.target.value })} placeholder="https://github.com/…" />
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold text-base mb-3">Skills & Tools</h2>
                <div className="flex flex-wrap gap-1.5">
                  {QA_SKILLS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSkill(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${(qa.skills || []).includes(s) ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={saveQA} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
              </button>
            </div>
          )}

          {/* ── CERTIFICATES ── */}
          {isQA && tab === 'certificates' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h2 className="font-semibold text-base">Certificates</h2>
                  <p className="text-xs text-[#111]/40 mt-0.5">Shown on your public profile</p>
                </div>
                <button onClick={addCert} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Plus size={13} /> Add
                </button>
              </div>
              {certs.length === 0 && (
                <div className="card text-center py-10">
                  <Award size={28} className="text-[#111]/15 mx-auto mb-2" />
                  <p className="text-sm text-[#111]/35">No certificates yet</p>
                </div>
              )}
              {certs.map((cert, idx) => (
                <CertForm key={cert.id || cert._id} cert={cert} userId={user.id}
                  onChange={u => { const a = [...certs]; a[idx] = u; setCerts(a) }}
                  onSave={() => saveCert(cert, idx)}
                  onDelete={() => delCert(cert, idx)} />
              ))}
            </div>
          )}

          {/* ── PORTFOLIO ── */}
          {isQA && tab === 'portfolio' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h2 className="font-semibold text-base">Portfolio</h2>
                  <p className="text-xs text-[#111]/40 mt-0.5">Add real projects you worked on</p>
                </div>
                <button onClick={addPortfolio} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
                  <Plus size={13} /> Add
                </button>
              </div>
              {portfolio.length === 0 && (
                <div className="card text-center py-10">
                  <Briefcase size={28} className="text-[#111]/15 mx-auto mb-2" />
                  <p className="text-sm text-[#111]/35">No projects yet</p>
                </div>
              )}
              {portfolio.map((item, idx) => (
                <PortfolioForm key={item.id || item._id} item={item}
                  onChange={u => { const a = [...portfolio]; a[idx] = u; setPortfolio(a) }}
                  onSave={() => savePortfolio(item, idx)}
                  onDelete={() => delPortfolio(item, idx)} />
              ))}
            </div>
          )}

          {/* ── COMPANY PROFILE ── */}
          {role === 'company' && tab === 'profile' && co !== null && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <h2 className="font-semibold text-base">Company logo</h2>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl bg-[#E8E6E1] overflow-hidden border border-[#E0DDD8] flex-shrink-0 flex items-center justify-center">
                    {co.logo_url ? <img src={co.logo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-2xl">🏢</span>}
                  </div>
                  <div>
                    <button onClick={() => logoRef.current?.click()} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                      <Upload size={13} /> Upload logo
                    </button>
                    <p className="text-xs text-[#111]/35 mt-1.5">JPG, PNG — max 2 MB</p>
                    <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        if (f.size > 2 * 1024 * 1024) { alert('Max 2MB'); return }
                        const url = await uploadFile(f, 'company-logos')
                        if (url) {
                          setCo({ ...co, logo_url: url })
                          await supabase.from('company_profiles').upsert({ user_id: user.id, logo_url: url }, { onConflict: 'user_id' })
                        }
                      }} />
                  </div>
                </div>
              </div>
              <div className="card space-y-4">
                <h2 className="font-semibold text-base">Company info</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Company name</label><input className="input" value={co.company_name || ''} onChange={e => setCo({ ...co, company_name: e.target.value })} placeholder="Acme Corp" /></div>
                  <div><label className="label">Website</label><input className="input" value={co.website || ''} onChange={e => setCo({ ...co, website: e.target.value })} placeholder="https://acme.com" /></div>
                </div>
                <div><label className="label">Description</label><textarea className="input resize-none h-24" value={co.description || ''} onChange={e => setCo({ ...co, description: e.target.value })} placeholder="Tell QA specialists about your company…" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">Industry</label>
                    <div className="select-wrap">
                      <select className="input" value={co.industry || ''} onChange={e => setCo({ ...co, industry: e.target.value })}>
                        <option value="">Select</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Size</label>
                    <div className="select-wrap">
                      <select className="input" value={co.company_size || ''} onChange={e => setCo({ ...co, company_size: e.target.value })}>
                        <option value="">Select</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Location</label><input className="input" value={co.location || ''} onChange={e => setCo({ ...co, location: e.target.value })} placeholder="New York, USA" /></div>
                </div>
                <div><label className="label">Contact email</label><input type="email" className="input" value={co.contact_email || ''} onChange={e => setCo({ ...co, contact_email: e.target.value })} placeholder="hr@company.com" /></div>
              </div>
              <button onClick={saveCo} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
              </button>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && <SettingsTab user={user} role={role} router={router} />}
        </div>
      </div>
    </>
  )
}

function CertForm({ cert, userId, onChange, onSave, onDelete }: any) {
  const [open,    setOpen]    = useState(!!cert._new)
  const [saving,  setSaving]  = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  const uploadImg = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('JPG, PNG or WebP only'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return }
    const path = `${userId}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('certificates').upload(path, file, { upsert: true })
    if (error || !data) { alert('Upload failed: ' + error?.message); return }
    const { data: u } = supabase.storage.from('certificates').getPublicUrl(data.path)
    onChange({ ...cert, image_url: u.publicUrl })
  }

  const handleSave = async () => { setSaving(true); await onSave(); setSaving(false); setOpen(false) }

  return (
    <div className="card border border-[#E8E6E1]">
      {lightbox && cert.image_url && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(false)} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm">✕ Close</button>
            <img src={cert.image_url} className="w-full rounded-xl" alt="Certificate" />
          </div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="cursor-pointer flex-1" onClick={() => setOpen(!open)}>
          <p className="font-medium text-sm">{cert.name || 'New certificate'}</p>
          {cert.issuer && <p className="text-xs text-[#111]/40 mt-0.5">{cert.issuer}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-xs text-[#111]/35 hover:text-[#111] px-2 py-1 transition-colors">{open ? 'Collapse' : 'Edit'}</button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1 transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-[#F0EDE8] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name</label><input className="input" value={cert.name || ''} onChange={e => onChange({ ...cert, name: e.target.value })} placeholder="ISTQB Foundation Level" /></div>
            <div><label className="label">Issuer</label><input className="input" value={cert.issuer || ''} onChange={e => onChange({ ...cert, issuer: e.target.value })} placeholder="ISTQB" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Certificate ID</label><input className="input font-mono text-xs" value={cert.certificate_id || ''} onChange={e => onChange({ ...cert, certificate_id: e.target.value })} placeholder="CTFL-123456" /></div>
            <div><label className="label">Issue date</label><input type="date" className="input" value={cert.issued_date || ''} max={new Date().toISOString().split('T')[0]} onChange={e => onChange({ ...cert, issued_date: e.target.value })} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none h-16" value={cert.description || ''} onChange={e => onChange({ ...cert, description: e.target.value })} placeholder="Brief description…" /></div>
          <div>
            <label className="label">Certificate image</label>
            <div className="flex items-center gap-3">
              {cert.image_url && (
                <button onClick={() => setLightbox(true)} className="relative group flex-shrink-0">
                  <img src={cert.image_url} className="w-20 h-14 object-cover rounded-lg border border-[#E8E6E1] group-hover:opacity-80 transition-opacity" alt="cert" />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/40 rounded-lg transition-opacity">View</span>
                </button>
              )}
              <button type="button" onClick={() => imgRef.current?.click()} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
                <Upload size={13} /> {cert.image_url ? 'Replace' : 'Upload'}
              </button>
              <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImg(f) }} />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-2">{saving ? 'Saving…' : 'Save certificate'}</button>
        </div>
      )}
    </div>
  )
}

function PortfolioForm({ item, onChange, onSave, onDelete }: any) {
  const [open,   setOpen]   = useState(!!item._new)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { setSaving(true); await onSave(); setSaving(false); setOpen(false) }

  return (
    <div className="card border border-[#E8E6E1]">
      <div className="flex justify-between items-start">
        <div className="cursor-pointer flex-1" onClick={() => setOpen(!open)}>
          <p className="font-medium text-sm">{item.title || 'New project'}</p>
          {item.company && <p className="text-xs text-[#111]/40 mt-0.5">{item.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="text-xs text-[#111]/35 hover:text-[#111] px-2 py-1">{open ? 'Collapse' : 'Edit'}</button>
          <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={13} /></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-[#F0EDE8] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Project title</label><input className="input" value={item.title || ''} onChange={e => onChange({ ...item, title: e.target.value })} placeholder="E-commerce QA" /></div>
            <div><label className="label">Company</label><input className="input" value={item.company || ''} onChange={e => onChange({ ...item, company: e.target.value })} placeholder="Acme Corp" /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none h-20" value={item.description || ''} onChange={e => onChange({ ...item, description: e.target.value })} placeholder="What you did and your impact…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start date</label><input type="date" className="input" value={item.start_date || ''} max={new Date().toISOString().split('T')[0]} onChange={e => onChange({ ...item, start_date: e.target.value })} /></div>
            <div>
              <label className="label">End date</label>
              {item.is_current
                ? <div className="input bg-[#F5F4F1] text-[#111]/35 text-sm">Present</div>
                : <input type="date" className="input" value={item.end_date || ''} max={new Date().toISOString().split('T')[0]} onChange={e => onChange({ ...item, end_date: e.target.value })} />
              }
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={item.is_current || false} onChange={e => onChange({ ...item, is_current: e.target.checked })} className="rounded" />
            <span className="text-sm text-[#111]/60">Currently working here</span>
          </label>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-2">{saving ? 'Saving…' : 'Save project'}</button>
        </div>
      )}
    </div>
  )
}

function SettingsTab({ user, role, router }: any) {
  const [passData,    setPassData]    = useState({ newPass: '', confirm: '' })
  const [passMsg,     setPassMsg]     = useState('')
  const [passErr,     setPassErr]     = useState('')
  const [savingPass,  setSavingPass]  = useState(false)
  const [emailSent,   setEmailSent]   = useState(false)
  const [sending,     setSending]     = useState(false)
  const [show,        setShow]        = useState(false)

  const changePassword = async () => {
    setPassErr(''); setPassMsg('')
    if (passData.newPass.length < 8)             { setPassErr('Min 8 characters'); return }
    if (!/[A-Z]/.test(passData.newPass))         { setPassErr('Must include uppercase letter'); return }
    if (!/[0-9]/.test(passData.newPass))         { setPassErr('Must include a number'); return }
    if (passData.newPass !== passData.confirm)    { setPassErr('Passwords do not match'); return }
    setSavingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passData.newPass })
    setSavingPass(false)
    if (error) { setPassErr(error.message); return }
    setPassMsg('Password updated!')
    setPassData({ newPass: '', confirm: '' })
  }

  const sendVerif = async () => {
    setSending(true)
    await supabase.auth.resend({ type: 'signup', email: user?.email })
    setSending(false)
    setEmailSent(true)
  }

  const strength = [
    passData.newPass.length >= 8,
    /[A-Z]/.test(passData.newPass),
    /[0-9]/.test(passData.newPass),
    passData.newPass.length >= 12,
  ]
  const score = strength.filter(Boolean).length
  const strengthColor = score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-400' : 'bg-emerald-500'

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <h2 className="font-semibold text-base">Account</h2>
        <div>
          <label className="label">Email</label>
          <div className="flex items-center gap-3">
            <input className="input bg-[#F5F4F1] flex-1" value={user?.email || ''} disabled />
            {user?.email_confirmed_at
              ? <span className="badge-verified whitespace-nowrap flex-shrink-0">✓ Verified</span>
              : <button onClick={sendVerif} disabled={sending || emailSent} className="btn-secondary text-xs px-3 py-2 whitespace-nowrap flex-shrink-0">
                  {emailSent ? 'Sent!' : sending ? 'Sending…' : 'Verify'}
                </button>
            }
          </div>
          {!user?.email_confirmed_at && <p className="text-xs text-amber-600 mt-1.5">⚠ Email not verified.</p>}
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input bg-[#F5F4F1] capitalize" value={role || ''} disabled />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-base">Change password</h2>
        <p className="text-xs text-[#111]/45">Min 8 chars · one uppercase · one number</p>
        <div className="relative">
          <label className="label">New password</label>
          <input type={show ? 'text' : 'password'} className="input pr-14" value={passData.newPass} onChange={e => setPassData({ ...passData, newPass: e.target.value })} placeholder="••••••••" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-8 text-xs text-[#111]/40 hover:text-[#111]/70">{show ? 'Hide' : 'Show'}</button>
        </div>
        {passData.newPass && (
          <div>
            <div className="flex gap-1 mb-1">
              {[0, 1, 2, 3].map(i => <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < score ? strengthColor : 'bg-[#E8E6E1]'}`} />)}
            </div>
            <p className="text-xs text-[#111]/40">{['Too weak', 'Weak', 'Good', 'Strong', 'Very strong'][score]}</p>
          </div>
        )}
        <div>
          <label className="label">Confirm password</label>
          <input type="password" className="input" value={passData.confirm} onChange={e => setPassData({ ...passData, confirm: e.target.value })} placeholder="••••••••" />
        </div>
        {passErr && <p className="text-xs text-red-600">{passErr}</p>}
        {passMsg && <p className="text-xs text-emerald-600">{passMsg}</p>}
        <button onClick={changePassword} disabled={savingPass} className="btn-primary disabled:opacity-50">
          {savingPass ? 'Updating…' : 'Update password'}
        </button>
      </div>

      <div className="card">
        <h2 className="font-semibold text-base mb-4">Session</h2>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="text-sm text-red-600 font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
          Log out
        </button>
      </div>
    </div>
  )
}
