'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import Link from 'next/link'
import { QA_SKILLS, AVAIL_LABELS } from '@/lib/types'
import { Search, Filter, MapPin, Clock, DollarSign, CheckCircle, X } from 'lucide-react'

export default function BrowseSpecialists() {
  const [specialists, setSpecialists] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [skills,   setSkills]   = useState<string[]>([])
  const [avail,    setAvail]    = useState('')
  const [minRate,  setMinRate]  = useState('')
  const [maxRate,  setMaxRate]  = useState('')
  const [location, setLocation] = useState('')
  const [showF,    setShowF]    = useState(false)
  const [target,   setTarget]   = useState<any>(null)
  const [me,       setMe]       = useState<any>(null)
  const [connected, setConnected] = useState<string[]>([])

useEffect(() => {
  load()
  supabase.auth.getUser().then(({ data }) => {
    setMe(data.user)
    if (data.user) {
      supabase.from('connection_requests')
        .select('receiver_id, sender_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${data.user.id},receiver_id.eq.${data.user.id}`)
        .then(({ data: conns }) => {
          if (conns) {
            const ids = conns.map(c =>
              c.sender_id === data.user!.id ? c.receiver_id : c.sender_id
            )
            setConnected(ids)
          }
        })
    }
  })
}, [])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('qa_profiles').select('*').eq('verification_status','verified').eq('is_public',true)
    if (avail)   q = q.eq('availability', avail)
    if (minRate) q = q.gte('hourly_rate', parseInt(minRate))
    if (maxRate) q = q.lte('hourly_rate', parseInt(maxRate))
    if (location) q = q.ilike('location', `%${location}%`)
    if (skills.length) q = q.overlaps('skills', skills)
    const { data } = await q
    let res = data || []
    if (search) {
      const s = search.toLowerCase()
      res = res.filter(x => x.full_name?.toLowerCase().includes(s) || x.title?.toLowerCase().includes(s) || x.bio?.toLowerCase().includes(s))
    }
    setSpecialists(res); setLoading(false)
  }

  const clear = () => { setSearch(''); setSkills([]); setAvail(''); setMinRate(''); setMaxRate(''); setLocation('') }
  const activeCount = [skills.length>0, avail, minRate, maxRate, location].filter(Boolean).length

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0F0F0F] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-white/40 mb-3">Find talent</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white mb-4">QA Specialists</h1>
            <p className="text-white/60 max-w-lg">Browse verified software testers and QA engineers ready for your next project.</p>
            <div className="flex gap-3 mt-8">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/>
                <input className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  placeholder="Search by name, title, or skills…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}/>
              </div>
              <button onClick={() => setShowF(!showF)} className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${showF ? 'bg-white text-[#0F0F0F] border-white' : 'bg-white/10 text-white border-white/20 hover:border-white/40'}`}>
                <Filter size={16}/> Filters
                {activeCount > 0 && <span className="bg-[#C8473A] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeCount}</span>}
              </button>
              <button onClick={load} className="btn-accent px-6">Search</button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {showF && (
            <div className="card mb-8 animate-fade-up">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-sm">Filters</h3>
                <button onClick={clear} className="text-xs text-[#0F0F0F]/50 hover:text-[#0F0F0F] flex items-center gap-1"><X size={12}/> Clear all</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="label">Availability</label>
                  <select className="input" value={avail} onChange={e=>setAvail(e.target.value)}>
                    <option value="">Any</option>
                    {Object.entries(AVAIL_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="label">Min rate ($/hr)</label><input type="number" className="input" value={minRate} onChange={e=>setMinRate(e.target.value)} placeholder="0"/></div>
                <div><label className="label">Max rate ($/hr)</label><input type="number" className="input" value={maxRate} onChange={e=>setMaxRate(e.target.value)} placeholder="200"/></div>
                <div><label className="label">Location</label><input className="input" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Ukraine, USA…"/></div>
              </div>
              <div>
                <label className="label">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {QA_SKILLS.map(s => (
                    <button key={s} onClick={() => setSkills(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s])}
                      className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${skills.includes(s) ? 'bg-[#0F0F0F] text-[#EAE7E0] border-[#0F0F0F]' : 'bg-[#EAE7E0] border-[#D8D4CB] text-[#0F0F0F]/60 hover:border-[#0F0F0F]/30'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-[#0F0F0F]/60 font-mono mb-6">{specialists.length} specialists found</p>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : specialists.length === 0 ? (
            <div className="text-center py-20 text-[#0F0F0F]/40"><p className="font-mono text-sm">No specialists found — try adjusting filters</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {specialists.map(s => (
                <SpecialistCard key={s.id} specialist={s}
        onConnect={() => me ? setTarget(s) : window.location.href='/auth/login'}
        isOwn={me?.id === s.user_id}
        isConnected={connected.includes(s.user_id)}/>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer/>
      {target && <ConnectionModal target={target} targetType="qa" onClose={() => setTarget(null)}/>}
    </>
  )
}

function SpecialistCard({ specialist: s, onConnect, isOwn, isConnected }: any) {
  return (
    <div className="card-hover">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 border border-[#D8D4CB] flex items-center justify-center">
          {s.photo_url
            ? <img src={s.photo_url} className="w-full h-full object-cover" alt={s.full_name}/>
            : <span style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold text-[#0F0F0F]/30">{s.full_name?.[0]||'?'}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 style={{ fontFamily:'var(--font-display)' }} className="font-bold text-base truncate">{s.full_name}</h3>
            <CheckCircle size={14} className="text-emerald-600 flex-shrink-0"/>
          </div>
          <p className="text-sm text-[#0F0F0F]/60 truncate">{s.title}</p>
        </div>
      </div>
      <p className="text-xs text-[#0F0F0F]/60 leading-relaxed mb-4 line-clamp-2">{s.bio}</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(s.skills||[]).slice(0,4).map((sk: string) => <span key={sk} className="skill-tag">{sk}</span>)}
        {(s.skills||[]).length > 4 && <span className="skill-tag">+{s.skills.length-4}</span>}
      </div>
      <div className="flex items-center gap-3 text-xs text-[#0F0F0F]/50 mb-4 flex-wrap">
        {s.location    && <span className="flex items-center gap-1"><MapPin size={11}/>{s.location}</span>}
        {s.availability && <span className="flex items-center gap-1"><Clock size={11}/>{AVAIL_LABELS[s.availability]}</span>}
        {s.hourly_rate  && <span className="flex items-center gap-1"><DollarSign size={11}/>${s.hourly_rate}/hr</span>}
      </div>
      <div className="flex gap-2">
  <Link href={`/specialists/${s.user_id}`} className="flex-1 text-center py-2 rounded-xl text-xs font-medium bg-[#D8D4CB] hover:bg-[#ccc8bf] transition-colors">View profile</Link>
  {!isOwn && (
    isConnected
      ? <Link href="/messages" className="flex-1 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center">Message</Link>
      : <button onClick={onConnect} className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#0F0F0F] text-[#EAE7E0] hover:bg-[#1A1A1A] transition-colors">Connect</button>
  )}
</div>
    </div>
  )
}
