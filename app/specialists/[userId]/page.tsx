'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import { MapPin, Clock, DollarSign, Linkedin, Github, CheckCircle, Award, X, Calendar } from 'lucide-react'
import { AVAIL_LABELS } from '@/lib/types'

export default function SpecialistProfile() {
  const { userId } = useParams() as { userId: string }
  const [profile, setProfile] = useState<any>(null)
  const [certs,   setCerts]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [me,      setMe]      = useState<any>(null)
  const [modal,   setModal]   = useState(false)
  const [cert,    setCert]    = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user))
    supabase.from('qa_profiles').select('*').eq('user_id', userId).single().then(async ({ data, error }) => {
      if (error || !data) { setLoading(false); return }
      setProfile(data)
      const { data: cs } = await supabase.from('certificates').select('*').eq('qa_profile_id', data.id)
      setCerts(cs || [])
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
  if (!profile) return (
    <><Navbar/><div className="min-h-screen pt-24 flex items-center justify-center"><div className="text-center"><h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold mb-3">Profile not found</h1></div></div></>
  )

  const isOwn = me?.id === userId

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0F0F0F] py-12">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-[#1A1A1A] overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center">
                {profile.photo_url
                  ? <img src={profile.photo_url} className="w-full h-full object-cover" alt={profile.full_name}/>
                  : <span style={{ fontFamily:'var(--font-display)' }} className="text-5xl font-bold text-white/20">{profile.full_name?.[0]||'?'}</span>
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl md:text-4xl font-bold text-white">{profile.full_name}</h1>
                  {profile.verification_status==='verified' && (
                    <span className="flex items-center gap-1 text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                      <CheckCircle size={11}/> Verified
                    </span>
                  )}
                </div>
                <p className="text-white/60 text-lg mb-4">{profile.title}</p>
                <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-6">
                  {profile.location        && <span className="flex items-center gap-1.5"><MapPin size={14}/>{profile.location}</span>}
                  {profile.availability    && <span className="flex items-center gap-1.5"><Clock size={14}/>{AVAIL_LABELS[profile.availability]}</span>}
                  {profile.hourly_rate     && <span className="flex items-center gap-1.5"><DollarSign size={14}/>${profile.hourly_rate}/hr</span>}
                  {profile.years_experience>0 && <span>🏆 {profile.years_experience} years exp.</span>}
                </div>
                <div className="flex gap-3 flex-wrap">
                  {!isOwn && (
                    <button onClick={() => me ? setModal(true) : window.location.href='/auth/login'} className="btn-accent">Connect</button>
                  )}
                  {profile.linkedin_url && (
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors">
                      <Linkedin size={15}/> LinkedIn
                    </a>
                  )}
                  {profile.github_url && (
                    <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors">
                      <Github size={15}/> GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {profile.bio && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-3">About</h2>
                  <p className="text-[#0F0F0F]/70 leading-relaxed text-sm">{profile.bio}</p>
                </div>
              )}
              {(profile.skills||[]).length > 0 && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Skills & Tools</h2>
                  <div className="flex flex-wrap gap-2">{profile.skills.map((s: string) => <span key={s} className="skill-tag">{s}</span>)}</div>
                </div>
              )}
              {certs.length > 0 && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Certificates</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {certs.map(c => (
                      <button key={c.id} onClick={() => setCert(c)}
                        className="text-left p-4 bg-[#EAE7E0] rounded-xl border border-[#D8D4CB] hover:border-[#0F0F0F]/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Award size={18} className="text-[#0F0F0F]/50"/>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-[#0F0F0F]/50 truncate">{c.issuer}</p>
                            {c.issued_date && (
                              <p className="text-xs text-[#0F0F0F]/40 mt-1 flex items-center gap-1">
                                <Calendar size={10}/>{new Date(c.issued_date).getFullYear()}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  {profile.location        && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><MapPin size={14} className="text-[#0F0F0F]/40 flex-shrink-0"/>{profile.location}</div>}
                  {profile.availability    && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><Clock size={14} className="text-[#0F0F0F]/40 flex-shrink-0"/>{AVAIL_LABELS[profile.availability]}</div>}
                  {profile.hourly_rate     && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><DollarSign size={14} className="text-[#0F0F0F]/40 flex-shrink-0"/>${profile.hourly_rate}/hour</div>}
                  {profile.years_experience>0 && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><span className="text-[#0F0F0F]/40">🏆</span>{profile.years_experience} years experience</div>}
                </div>
              </div>
              {!isOwn && <button onClick={() => me ? setModal(true) : window.location.href='/auth/login'} className="btn-accent w-full">Connect with {profile.full_name?.split(' ')[0]}</button>}
            </div>
          </div>
        </div>
      </div>
      <Footer/>

      {modal && <ConnectionModal target={profile} targetType="qa" onClose={() => setModal(false)}/>}

      {cert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCert(null)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-up">
            <button onClick={() => setCert(null)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[#EAE7E0] transition-colors"><X size={18}/></button>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center flex-shrink-0"><Award size={28} className="text-[#0F0F0F]/40"/></div>
              <div>
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">{cert.name}</h2>
                <p className="text-[#0F0F0F]/60 text-sm">{cert.issuer}</p>
              </div>
            </div>
            {cert.image_url && <img src={cert.image_url} className="w-full rounded-2xl border border-[#D8D4CB] mb-5 object-contain max-h-64" alt="Certificate"/>}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {cert.certificate_id && (
                <div className="bg-[#EAE7E0] rounded-xl p-3">
                  <p className="text-xs font-mono text-[#0F0F0F]/40 uppercase tracking-widest mb-1">Certificate ID</p>
                  <p className="text-sm font-mono font-medium">{cert.certificate_id}</p>
                </div>
              )}
              {cert.issued_date && (
                <div className="bg-[#EAE7E0] rounded-xl p-3">
                  <p className="text-xs font-mono text-[#0F0F0F]/40 uppercase tracking-widest mb-1">Issued</p>
                  <p className="text-sm font-medium">{new Date(cert.issued_date).toLocaleDateString([],{year:'numeric',month:'long'})}</p>
                </div>
              )}
            </div>
            {cert.description && (
              <div>
                <p className="text-xs font-mono text-[#0F0F0F]/40 uppercase tracking-widest mb-2">About this certificate</p>
                <p className="text-sm text-[#0F0F0F]/70 leading-relaxed">{cert.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
