'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QA_SKILLS, AVAIL_LABELS } from '@/lib/types'
import { CheckCircle, Upload, ArrowRight, ArrowLeft } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic info' },
  { id: 2, label: 'Skills' },
  { id: 3, label: 'Experience' },
  { id: 4, label: 'Certificates' },
]

export default function Onboarding() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [loading, setLoading] = useState(true)

  // Form data
  const [fullName,   setFullName]   = useState('')
  const [title,      setTitle]      = useState('')
  const [bio,        setBio]        = useState('')
  const [location,   setLocation]   = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [availability, setAvailability] = useState('freelance')
  const [skills,     setSkills]     = useState<string[]>([])
  const [yearsExp,   setYearsExp]   = useState(0)
  const [linkedin,   setLinkedin]   = useState('')
  const [github,     setGithub]     = useState('')
  const [photoUrl,   setPhotoUrl]   = useState('')
  const [certs,      setCerts]      = useState<any[]>([
    { name: '', issuer: '', certificate_id: '', issued_date: '', image_url: '' }
  ])

  // Check if user needs onboarding
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/login'); return }
      const u = session.user
      setUser(u)

      const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', u.id).single()
      if (!prof || prof.role !== 'qa') { router.push('/dashboard'); return }

      // Check if already completed onboarding
      const { data: qa } = await supabase.from('qa_profiles').select('full_name, onboarding_completed').eq('user_id', u.id).single()
      if (qa?.onboarding_completed) { router.push('/dashboard'); return }
      if (qa?.full_name) setFullName(qa.full_name)

      setLoading(false)
    })
  }, [])

  // Progress percentage
  const progress = Math.round((step / STEPS.length) * 100)

  const toggleSkill = (s: string) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const uploadPhoto = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('JPG or PNG only'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return }
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error || !data) { alert('Upload failed'); return }
    const { data: u } = supabase.storage.from('avatars').getPublicUrl(data.path)
    setPhotoUrl(u.publicUrl)
  }

  const uploadCertImg = async (file: File, idx: number) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('JPG or PNG only'); return }
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('certificates').upload(path, file, { upsert: true })
    if (error || !data) { alert('Upload failed'); return }
    const { data: u } = supabase.storage.from('certificates').getPublicUrl(data.path)
    const updated = [...certs]; updated[idx] = { ...updated[idx], image_url: u.publicUrl }
    setCerts(updated)
  }

  const canProceed = () => {
    if (step === 1) return fullName.trim().length >= 2 && title.trim().length >= 2 && bio.trim().length >= 20
    if (step === 2) return skills.length >= 3
    if (step === 3) return yearsExp >= 0
    if (step === 4) return certs.some(c => c.name.trim() && c.issuer.trim())
    return true
  }

  const finish = async () => {
    setSaving(true)
    // Save qa_profile
    const { data: qa, error } = await supabase.from('qa_profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      title, bio, location,
      hourly_rate: parseInt(hourlyRate) || null,
      availability,
      skills,
      years_experience: yearsExp,
      linkedin_url: linkedin || null,
      github_url: github || null,
      photo_url: photoUrl || null,
      is_public: true,
      verification_status: 'pending',
      onboarding_completed: true,
    }, { onConflict: 'user_id' }).select().single()

    if (!error && qa) {
      // Save certificates
      const validCerts = certs.filter(c => c.name.trim() && c.issuer.trim())
      if (validCerts.length > 0) {
        await supabase.from('certificates').insert(
          validCerts.map(c => ({
            qa_profile_id: qa.id,
            name: c.name,
            issuer: c.issuer,
            certificate_id: c.certificate_id || null,
            issued_date: c.issued_date || null,
            image_url: c.image_url || null,
          }))
        )
      }

      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('user_id').eq('role', 'admin')
      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(
          admins.map(a => ({
            user_id: a.user_id,
            type: 'verification_request',
            title: 'New verification request',
            message: `${fullName} completed their profile and is requesting verification.`,
            link: '/admin',
          }))
        )
      }
    }

    setSaving(false)
    router.push('/dashboard')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F1]">
      <div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F4F1] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E6E1] px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-lg tracking-tight">HHub — Profile Setup</span>
            <span className="text-sm text-[#111]/45 font-mono">Step {step} of {STEPS.length}</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
            <div className="h-full bg-[#111] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-2 mt-3">
            {STEPS.map(s => (
              <div key={s.id} className={`flex items-center gap-1.5 text-xs font-medium ${s.id <= step ? 'text-[#111]' : 'text-[#111]/30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${s.id < step ? 'bg-[#111] text-white' : s.id === step ? 'bg-[#111] text-white' : 'bg-[#E8E6E1] text-[#111]/40'}`}>
                  {s.id < step ? '✓' : s.id}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl">

          {/* Step 1: Basic info */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Tell us about yourself</h1>
                <p className="text-[#111]/50 mt-1 text-sm">This will be shown on your public profile.</p>
              </div>

              {/* Photo */}
              <div className="card">
                <label className="label">Profile photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-bold text-[#111]/25">{fullName?.[0] || '?'}</span>}
                  </div>
                  <label className="btn-secondary text-xs px-3 py-2 cursor-pointer flex items-center gap-1.5">
                    <Upload size={13} /> Upload photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
                  </label>
                </div>
              </div>

              <div className="card space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full name *</label>
                    <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="label">Job title *</label>
                    <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Senior QA Engineer" />
                  </div>
                </div>
                <div>
                  <label className="label">Bio * <span className="text-[#111]/30 normal-case font-normal">(min 20 chars)</span></label>
                  <textarea className="input resize-none h-24" value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe your experience, what you specialize in, and what kind of projects you're looking for…" />
                  <p className={`text-xs mt-1 ${bio.length < 20 ? 'text-[#111]/30' : 'text-emerald-600'}`}>{bio.length} / 20 min</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Location</label>
                    <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Kyiv, Ukraine" />
                  </div>
                  <div>
                    <label className="label">Rate ($/hr)</label>
                    <input type="number" className="input" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="50" />
                  </div>
                </div>
                <div>
                  <label className="label">Availability</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(AVAIL_LABELS).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setAvailability(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${availability === v ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">LinkedIn</label>
                    <input className="input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
                  </div>
                  <div>
                    <label className="label">GitHub</label>
                    <input className="input" value={github} onChange={e => setGithub(e.target.value)} placeholder="https://github.com/…" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Your skills & tools</h1>
                <p className="text-[#111]/50 mt-1 text-sm">Select at least 3. These help companies find you.</p>
              </div>
              <div className="card">
                <div className="flex flex-wrap gap-2">
                  {QA_SKILLS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSkill(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${skills.includes(s) ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E0DDD8] text-[#111]/55 hover:border-[#111]/30'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className={`text-xs mt-4 ${skills.length < 3 ? 'text-[#111]/35' : 'text-emerald-600 font-medium'}`}>
                  {skills.length} selected {skills.length < 3 ? `(${3 - skills.length} more required)` : '✓'}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Your experience</h1>
                <p className="text-[#111]/50 mt-1 text-sm">Tell us about your work history.</p>
              </div>
              <div className="card space-y-4">
                <div>
                  <label className="label">Years of experience</label>
                  <input type="number" className="input" value={yearsExp} onChange={e => setYearsExp(parseInt(e.target.value) || 0)} min={0} max={50} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Certificates */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
                <p className="text-[#111]/50 mt-1 text-sm">At least one certificate is required. <strong>ISTQB Foundation Level</strong> is required for verification.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                ⭐ <strong>ISTQB Foundation Level</strong> certificate is mandatory for profile verification.
              </div>
              {certs.map((cert, idx) => (
                <div key={idx} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Certificate {idx + 1}</h3>
                    {certs.length > 1 && (
                      <button onClick={() => setCerts(certs.filter((_, i) => i !== idx))} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Certificate name *</label>
                      <input className="input" value={cert.name} onChange={e => { const u=[...certs]; u[idx]={...u[idx],name:e.target.value}; setCerts(u) }} placeholder="ISTQB Foundation Level" />
                    </div>
                    <div>
                      <label className="label">Issuer *</label>
                      <input className="input" value={cert.issuer} onChange={e => { const u=[...certs]; u[idx]={...u[idx],issuer:e.target.value}; setCerts(u) }} placeholder="ISTQB" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Certificate ID</label>
                      <input className="input font-mono text-xs" value={cert.certificate_id} onChange={e => { const u=[...certs]; u[idx]={...u[idx],certificate_id:e.target.value}; setCerts(u) }} placeholder="CTFL-123456" />
                    </div>
                    <div>
                      <label className="label">Issue date</label>
                      <input type="date" className="input" value={cert.issued_date} max={new Date().toISOString().split('T')[0]} onChange={e => { const u=[...certs]; u[idx]={...u[idx],issued_date:e.target.value}; setCerts(u) }} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Certificate image</label>
                    <div className="flex items-center gap-3">
                      {cert.image_url && <img src={cert.image_url} className="w-16 h-12 object-cover rounded-lg border border-[#E8E6E1]" alt="" />}
                      <label className="btn-secondary text-xs px-3 py-2 cursor-pointer flex items-center gap-1.5">
                        <Upload size={13} /> {cert.image_url ? 'Replace' : 'Upload image'}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCertImg(f, idx) }} />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setCerts([...certs, { name:'', issuer:'', certificate_id:'', issued_date:'', image_url:'' }])}
                className="btn-secondary w-full text-sm">+ Add another certificate</button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-30">
              <ArrowLeft size={16} /> Back
            </button>
            {step < STEPS.length ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="btn-primary flex items-center gap-2 disabled:opacity-40">
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={finish} disabled={!canProceed() || saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-40">
                {saving ? 'Submitting…' : 'Complete setup'} <CheckCircle size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
