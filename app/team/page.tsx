'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Linkedin } from 'lucide-react'

export default function Team() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('team_members').select('*').order('sort_order').then(({ data }) => {
      setMembers(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0A0A0A] py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="section-tag text-white/35 mb-4">The people behind HHub</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl font-bold text-white mb-4">Our Team</h1>
            <p className="text-white/45 text-lg max-w-xl mx-auto">A small but passionate team building the go-to QA platform for professionals worldwide.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-20">
          {/* Founder - always shown, centered */}
          <div className="text-center mb-16">
            <p className="section-tag mb-8">Founder</p>
            <div className="inline-block">
              <div className="w-32 h-32 bg-[#D8D4CB] rounded-3xl mx-auto mb-5 overflow-hidden flex items-center justify-center border border-[#ECEAE4]">
                <span style={{ fontFamily:'var(--font-display)' }} className="text-5xl font-bold text-[#0F0F0F]/25">D</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold mb-1">Hubenko Dias</h2>
              <p className="text-[#0F0F0F]/50 mb-3">Founder & CEO</p>
              <a href="https://www.linkedin.com/company/hhubqa" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors border border-[#D8D4CB] px-4 py-2 rounded-full hover:border-[#0F0F0F]/30">
                <Linkedin size={14}/> LinkedIn
              </a>
            </div>
          </div>

          {/* Team members from DB */}
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : members.length > 0 ? (
            <div>
              <p className="section-tag text-center mb-10">Team</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
                {members.map(m => (
                  <div key={m.id}>
                    <div className="w-24 h-24 bg-[#D8D4CB] rounded-2xl mx-auto mb-4 overflow-hidden flex items-center justify-center border border-[#ECEAE4]">
                      {m.photo_url
                        ? <img src={m.photo_url} className="w-full h-full object-cover" alt={m.name}/>
                        : <span style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-[#0F0F0F]/25">{m.name?.[0]}</span>
                      }
                    </div>
                    <h3 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-1">{m.name}</h3>
                    <p className="text-[#0F0F0F]/50 text-sm mb-2">{m.role}</p>
                    {m.linkedin_url && (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#0F0F0F]/40 hover:text-[#0F0F0F] transition-colors">
                        <Linkedin size={12}/> LinkedIn
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Footer/>
    </>
  )
}
