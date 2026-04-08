'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import Link from 'next/link'
import { QA_SKILLS, AVAIL_LABELS } from '@/lib/types'
import { MapPin, DollarSign, CheckCircle, Heart, Star, SlidersHorizontal, X } from 'lucide-react'

export default function BrowseSpecialists() {
  const [specialists, setSpecialists] = useState<any[]>([])
  const [allLocations, setAllLocations] = useState<string[]>([])
  const [loading,    setLoading]    = useState(true)
  const [skills,     setSkills]     = useState<string[]>([])
  const [avail,      setAvail]      = useState('')
  const [minRate,    setMinRate]    = useState('')
  const [maxRate,    setMaxRate]    = useState('')
  const [location,   setLocation]   = useState('')
  const [locSuggestions, setLocSuggestions] = useState<string[]>([])
  const [showLocDD,  setShowLocDD]  = useState(false)
  const [showF,      setShowF]      = useState(false)
  const [target,     setTarget]     = useState<any>(null)
  const [me,         setMe]         = useState<any>(null)
  const [connected,  setConnected]  = useState<string[]>([])
  const [favorites,  setFavorites]  = useState<string[]>([])
  const [ratings,    setRatings]    = useState<Record<string, number>>({})
  const locRef = useRef<HTMLDivElement>(null)

  // Auto-apply filters when they change
  useEffect(() => {
    load()
  }, [avail, minRate, maxRate, location, skills])

  useEffect(() => {
    load()
    // Load all unique locations for autocomplete
    supabase.from('qa_profiles').select('location').eq('verification_status', 'verified').eq('is_public', true)
      .then(({ data }) => {
        const locs = [...new Set((data || []).map(r => r.location).filter(Boolean))] as string[]
        setAllLocations(locs)
      })

    supabase.auth.getUser().then(async ({ data }) => {
      setMe(data.user)
      if (!data.user) return
      const { data: conns } = await supabase.from('connection_requests')
        .select('receiver_id,sender_id').eq('status', 'accepted')
        .or(`sender_id.eq.${data.user.id},receiver_id.eq.${data.user.id}`)
      if (conns) setConnected(conns.map(c => c.sender_id === data.user!.id ? c.receiver_id : c.sender_id))
      const { data: favs } = await supabase.from('favorites').select('target_id').eq('user_id', data.user.id).eq('target_type', 'qa')
      if (favs) setFavorites(favs.map(f => f.target_id))
    })

    // Close location dropdown on outside click
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setShowLocDD(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Update suggestions when location input changes
  useEffect(() => {
    if (!location.trim()) { setLocSuggestions([]); return }
    const filtered = allLocations.filter(l => l.toLowerCase().includes(location.toLowerCase()))
    setLocSuggestions(filtered.slice(0, 6))
    setShowLocDD(true)
  }, [location, allLocations])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('qa_profiles').select('*').eq('verification_status', 'verified').eq('is_public', true)
    if (avail)   q = q.eq('availability', avail)
    if (minRate) q = q.gte('hourly_rate', parseInt(minRate))
    if (maxRate) q = q.lte('hourly_rate', parseInt(maxRate))
    if (location) q = q.ilike('location', `%${location}%`)
    if (skills.length) q = q.overlaps('skills', skills)
    const { data } = await q
    const res = data || []
    if (res.length) {
      const { data: revs } = await supabase.from('reviews').select('target_id,rating').in('target_id', res.map(r => r.user_id))
      if (revs) {
        const rMap: Record<string, number[]> = {}
        revs.forEach(r => { if (!rMap[r.target_id]) rMap[r.target_id] = []; rMap[r.target_id].push(r.rating) })
        const avgMap: Record<string, number> = {}
        Object.entries(rMap).forEach(([id, rs]) => { avgMap[id] = rs.reduce((a, b) => a + b, 0) / rs.length })
        setRatings(avgMap)
      }
    }
    setSpecialists(res)
    setLoading(false)
  }

  const toggleFav = async (userId: string) => {
    if (!me) { window.location.href = '/auth/login'; return }
    if (favorites.includes(userId)) {
      await supabase.from('favorites').delete().eq('user_id', me.id).eq('target_id', userId).eq('target_type', 'qa')
      setFavorites(p => p.filter(f => f !== userId))
    } else {
      await supabase.from('favorites').insert({ user_id: me.id, target_id: userId, target_type: 'qa' })
      setFavorites(p => [...p, userId])
    }
  }

  const clear = () => { setSkills([]); setAvail(''); setMinRate(''); setMaxRate(''); setLocation('') }
  const activeCount = [skills.length > 0, avail, minRate, maxRate, location].filter(Boolean).length

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0A0A0A] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-white/35 mb-3">Find talent</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white mb-3">QA Specialists</h1>
            <p className="text-white/45 max-w-lg text-sm">Browse verified software testers and QA engineers. Filter to find your perfect match.</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setShowF(!showF)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${showF ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : 'bg-white text-[#0F0F0F] border-[#D8D4CB] hover:border-[#0F0F0F]/30'}`}>
              <SlidersHorizontal size={15}/> Filters
              {activeCount > 0 && <span className="bg-[#C8473A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>}
            </button>
            {activeCount > 0 && (
              <button onClick={clear} className="flex items-center gap-1 text-xs text-[#0F0F0F]/45 hover:text-[#0F0F0F] transition-colors">
                <X size={12}/> Clear all
              </button>
            )}
            <span className="ml-auto text-sm text-[#0F0F0F]/45 font-mono">{specialists.length} specialists</span>

          </div>

          {showF && (
            <div className="card mb-6 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="label">Availability</label>
                  <select className="input" value={avail} onChange={e => setAvail(e.target.value)}>
                    <option value="">Any</option>
                    {Object.entries(AVAIL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="label">Min rate ($/hr)</label><input type="number" className="input" value={minRate} onChange={e => setMinRate(e.target.value)} placeholder="0"/></div>
                <div><label className="label">Max rate ($/hr)</label><input type="number" className="input" value={maxRate} onChange={e => setMaxRate(e.target.value)} placeholder="200"/></div>
                {/* Location with autocomplete */}
                <div ref={locRef} className="relative">
                  <label className="label">Location</label>
                  <input
                    className="input"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    onFocus={() => location && setShowLocDD(true)}
                    placeholder="Type a country or city…"
                    autoComplete="off"
                  />
                  {showLocDD && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D8D4CB] rounded-xl shadow-lg z-20 overflow-hidden">
                      {locSuggestions.length > 0 ? (
                        locSuggestions.map(loc => (
                          <button key={loc} onClick={() => { setLocation(loc); setShowLocDD(false) }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors flex items-center gap-2">
                            <MapPin size={13} className="text-[#0F0F0F]/35 flex-shrink-0"/> {loc}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-[#0F0F0F]/40 font-mono">No specialists from "{location}"</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Skills & Tools</label>
                <div className="flex flex-wrap gap-2">
                  {QA_SKILLS.map(s => (
                    <button key={s} onClick={() => setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])}
                      className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-150 ${skills.includes(s) ? 'bg-[#0F0F0F] text-white border-[#0F0F0F]' : 'bg-white border-[#D8D4CB] text-[#0F0F0F]/55 hover:border-[#0F0F0F]/35'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : specialists.length === 0 ? (
            <div className="text-center py-20 text-[#0F0F0F]/40"><p className="font-mono text-sm">No specialists match your filters</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {specialists.map(s => (
                <SpecialistCard key={s.id} specialist={s}
                  rating={ratings[s.user_id]}
                  isFav={favorites.includes(s.user_id)}
                  onFav={() => toggleFav(s.user_id)}
                  onConnect={() => me ? setTarget(s) : window.location.href = '/auth/login'}
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

function SpecialistCard({ specialist: s, rating, isFav, onFav, onConnect, isOwn, isConnected }: any) {
  return (
    <div className="card-hover group relative flex flex-col">
      <button onClick={e => { e.preventDefault(); onFav() }} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#EAE7E0] transition-colors z-10">
        <Heart size={15} className={isFav ? 'text-[#C8473A] fill-[#C8473A]' : 'text-[#0F0F0F]/25'}/>
      </button>

      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EDE8] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#ECEAE4]">
          {s.photo_url
            ? <img src={s.photo_url} className="w-full h-full object-cover" alt={s.full_name}/>
            : <span style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold text-[#0F0F0F]/20">{s.full_name?.[0] || '?'}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-bold text-base truncate">{s.full_name}</h3>
            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0"/>
          </div>
          <p className="text-sm text-[#0F0F0F]/50 truncate">{s.title}</p>
          {rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} className="text-amber-400 fill-amber-400"/>
              <span className="text-xs text-[#0F0F0F]/45">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {s.availability !== 'not-available' && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"/>
          <span className="text-xs text-emerald-700 font-medium">{AVAIL_LABELS[s.availability]}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(s.skills || []).slice(0, 4).map((sk: string) => <span key={sk} className="skill-pill">{sk}</span>)}
        {(s.skills || []).length > 4 && <span className="skill-pill">+{s.skills.length - 4}</span>}
      </div>

      <div className="flex items-center gap-4 text-xs text-[#0F0F0F]/40 mb-4 flex-wrap">
        {s.location    && <span className="flex items-center gap-1"><MapPin size={10}/>{s.location}</span>}
        {s.hourly_rate && <span className="flex items-center gap-1"><DollarSign size={10}/>${s.hourly_rate}/hr</span>}
        {s.years_experience > 0 && <span>{s.years_experience}y exp</span>}
      </div>

      <div className="flex gap-2 pt-4 border-t border-[#F0EDE8] mt-auto">
        <Link href={`/specialists/${s.user_id}`} className="flex-1 text-center py-2.5 rounded-xl text-xs font-medium bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors">
          View profile
        </Link>
        {!isOwn && (
          isConnected
            ? <Link href="/messages" className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-center">Message</Link>
            : <button onClick={onConnect} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] transition-colors">Connect</button>
        )}
      </div>
    </div>
  )
}
