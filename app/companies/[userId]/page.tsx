'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import { MapPin, Globe, Building2, Mail } from 'lucide-react'

export default function CompanyProfile() {
  const { userId } = useParams() as { userId: string }
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [me,      setMe]      = useState<any>(null)
  const [modal,   setModal]   = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user))
    supabase.from('company_profiles').select('*').eq('user_id', userId).single().then(({ data, error }) => {
      if (!error) setProfile(data)
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
  if (!profile) return (
    <><Navbar/><div className="min-h-screen pt-24 flex items-center justify-center"><h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold">Company not found</h1></div></>
  )

  const isOwn = me?.id === userId

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0F0F0F] py-12">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-[#1A1A1A] border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {profile.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover" alt={profile.company_name}/> : <Building2 size={36} className="text-white/20"/>}
              </div>
              <div className="flex-1">
                <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl md:text-4xl font-bold text-white mb-2">{profile.company_name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-5">
                  {profile.industry    && <span>{profile.industry}</span>}
                  {profile.company_size && <span className="flex items-center gap-1"><Building2 size={13}/>{profile.company_size} employees</span>}
                  {profile.location    && <span className="flex items-center gap-1"><MapPin size={13}/>{profile.location}</span>}
                </div>
                <div className="flex gap-3 flex-wrap">
                  {!isOwn && <button onClick={() => me ? setModal(true) : window.location.href='/auth/login'} className="btn-accent">Connect</button>}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2.5 rounded-full text-sm hover:bg-white/20 transition-colors">
                      <Globe size={15}/> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              {profile.description && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-3">About the company</h2>
                  <p className="text-[#0F0F0F]/70 leading-relaxed text-sm">{profile.description}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  {profile.industry     && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><span className="text-[#0F0F0F]/40">⚡</span>{profile.industry}</div>}
                  {profile.company_size && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><Building2 size={14} className="text-[#0F0F0F]/40"/>{profile.company_size} employees</div>}
                  {profile.location     && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><MapPin size={14} className="text-[#0F0F0F]/40"/>{profile.location}</div>}
                  {profile.contact_email && <div className="flex items-center gap-2 text-[#0F0F0F]/70"><Mail size={14} className="text-[#0F0F0F]/40"/>{profile.contact_email}</div>}
                </div>
              </div>
              {!isOwn && <button onClick={() => me ? setModal(true) : window.location.href='/auth/login'} className="btn-accent w-full">Connect with {profile.company_name}</button>}
            </div>
          </div>
        </div>
      </div>
      <Footer/>
      {modal && <ConnectionModal target={profile} targetType="company" onClose={() => setModal(false)}/>}
    </>
  )
}
