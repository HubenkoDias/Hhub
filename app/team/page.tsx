'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Linkedin, Edit2, Check, X } from 'lucide-react'

const FOUNDER_KEY = 'founder_profile'

export default function Team() {
  const [members,  setMembers]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [user,     setUser]     = useState<any>(null)
  const [role,     setRole]     = useState<string|null>(null)
  const [editFounder, setEditFounder] = useState(false)
  const [founder,  setFounder]  = useState({
    name: 'Hubenko Dias',
    title: 'Founder & CEO',
    bio: 'Building the trusted QA ecosystem — a place people turn to when they need quality assurance done properly.',
    linkedin: 'https://www.linkedin.com/company/hhubqa',
    photo_url: '',
  })
  const [editData, setEditData] = useState({ ...founder })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
      if (p) setRole(p.role)
    })
    // Load founder settings from DB (stored as a special team member with sort_order = -1)
    supabase.from('team_members').select('*').eq('sort_order', -1).single().then(({ data }) => {
      if (data) {
        setFounder({ name: data.name, title: data.role, bio: data.bio || founder.bio, linkedin: data.linkedin_url || founder.linkedin, photo_url: data.photo_url || '' })
        setEditData({ name: data.name, title: data.role, bio: data.bio || founder.bio, linkedin: data.linkedin_url || founder.linkedin, photo_url: data.photo_url || '' })
      }
    })
    supabase.from('team_members').select('*').gte('sort_order', 0).order('sort_order').then(({ data }) => {
      setMembers(data || [])
      setLoading(false)
    })
  }, [])

  const saveFounder = async () => {
    // Check if founder record exists
    const { data: existing } = await supabase.from('team_members').select('id').eq('sort_order', -1).single()
    if (existing) {
      await supabase.from('team_members').update({
        name: editData.name, role: editData.title, bio: editData.bio,
        linkedin_url: editData.linkedin, photo_url: editData.photo_url || null,
      }).eq('id', existing.id)
    } else {
      await supabase.from('team_members').insert({
        name: editData.name, role: editData.title, bio: editData.bio,
        linkedin_url: editData.linkedin, photo_url: editData.photo_url || null, sort_order: -1,
      })
    }
    setFounder({ ...editData })
    setEditFounder(false)
  }

  const isAdmin = role === 'admin'

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0A0A0A] py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="section-tag text-white/35 mb-4">The people behind HHub</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl font-bold text-white mb-4">Our Team</h1>
            <p className="text-white/45 text-lg max-w-xl mx-auto">A small but passionate team building the go-to QA platform.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-20">
          {/* Founder */}
          <div className="text-center mb-16">
            <p className="section-tag mb-8">Founder</p>
            <div className="inline-block relative">
              {isAdmin && !editFounder && (
                <button onClick={() => { setEditData({...founder}); setEditFounder(true) }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-[#0F0F0F] text-white rounded-full flex items-center justify-center hover:bg-[#C8473A] transition-colors z-10">
                  <Edit2 size={13}/>
                </button>
              )}

              {editFounder ? (
                <div className="text-left card w-96">
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="font-bold text-lg mb-4">Edit founder profile</h3>
                  <div className="space-y-3">
                    <div><label className="label">Name</label><input className="input" value={editData.name} onChange={e => setEditData({...editData,name:e.target.value})}/></div>
                    <div><label className="label">Title</label><input className="input" value={editData.title} onChange={e => setEditData({...editData,title:e.target.value})}/></div>
                    <div><label className="label">Bio</label><textarea className="input resize-none h-20" value={editData.bio} onChange={e => setEditData({...editData,bio:e.target.value})}/></div>
                    <div><label className="label">LinkedIn URL</label><input className="input" value={editData.linkedin} onChange={e => setEditData({...editData,linkedin:e.target.value})}/></div>
                    <div><label className="label">Photo URL</label><input className="input" value={editData.photo_url} onChange={e => setEditData({...editData,photo_url:e.target.value})} placeholder="https://..."/></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={saveFounder} className="btn-primary text-sm flex-1"><Check size={14}/> Save</button>
                    <button onClick={() => setEditFounder(false)} className="btn-secondary text-sm flex-1"><X size={14}/> Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-32 h-32 bg-[#D8D4CB] rounded-3xl mx-auto mb-5 overflow-hidden flex items-center justify-center border border-[#ECEAE4]">
                    {founder.photo_url
                      ? <img src={founder.photo_url} className="w-full h-full object-cover" alt={founder.name}/>
                      : <span style={{ fontFamily:'var(--font-display)' }} className="text-5xl font-bold text-[#0F0F0F]/25">D</span>
                    }
                  </div>
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold mb-1">{founder.name}</h2>
                  <p className="text-[#0F0F0F]/50 mb-3">{founder.title}</p>
                  {founder.bio && <p className="text-[#0F0F0F]/55 text-sm max-w-sm mx-auto mb-4 leading-relaxed">{founder.bio}</p>}
                  {founder.linkedin && (
                    <a href={founder.linkedin} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors border border-[#D8D4CB] px-4 py-2 rounded-full hover:border-[#0F0F0F]/30">
                      <Linkedin size={14}/> LinkedIn
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Team members */}
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
