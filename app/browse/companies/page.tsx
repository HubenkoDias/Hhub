'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import Link from 'next/link'
import { INDUSTRIES, COMPANY_SIZES } from '@/lib/types'
import { Search, Filter, MapPin, Globe, Building2, X } from 'lucide-react'

export default function BrowseCompanies() {
  const [companies,  setCompanies]  = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [industry,   setIndustry]   = useState('')
  const [size,       setSize]       = useState('')
  const [location,   setLocation]   = useState('')
  const [showF,      setShowF]      = useState(false)
  const [target,     setTarget]     = useState<any>(null)
  const [me,         setMe]         = useState<any>(null)
  const [connected,  setConnected]  = useState<string[]>([])

  useEffect(() => {
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
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('company_profiles').select('*')
    if (industry) q = q.eq('industry', industry)
    if (size)     q = q.eq('company_size', size)
    if (location) q = q.ilike('location', `%${location}%`)
    const { data } = await q
    let res = data || []
    if (search) {
      const s = search.toLowerCase()
      res = res.filter(x =>
        x.company_name?.toLowerCase().includes(s) ||
        x.description?.toLowerCase().includes(s)
      )
    }
    setCompanies(res)
    setLoading(false)
  }

  const clear = () => { setSearch(''); setIndustry(''); setSize(''); setLocation('') }
  const activeCount = [industry, size, location].filter(Boolean).length

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0F0F0F] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-white/40 mb-3">Find work</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white mb-4">Companies Hiring</h1>
            <p className="text-white/60 max-w-lg">Browse companies looking for QA specialists and quality assurance teams.</p>
            <div className="flex gap-3 mt-8">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"/>
                <input
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                  placeholder="Search by company name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load()}
                />
              </div>
              <button
                onClick={() => setShowF(!showF)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all ${showF ? 'bg-white text-[#0F0F0F] border-white' : 'bg-white/10 text-white border-white/20 hover:border-white/40'}`}
              >
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
                <button onClick={clear} className="text-xs text-[#0F0F0F]/50 hover:text-[#0F0F0F] flex items-center gap-1">
                  <X size={12}/> Clear all
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Industry</label>
                  <select className="input" value={industry} onChange={e => setIndustry(e.target.value)}>
                    <option value="">All industries</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Company size</label>
                  <select className="input" value={size} onChange={e => setSize(e.target.value)}>
                    <option value="">Any size</option>
                    {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="USA, Europe…"/>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-[#0F0F0F]/60 font-mono mb-6">{companies.length} companies found</p>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-20 text-[#0F0F0F]/40">
              <p className="font-mono text-sm">No companies found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map(c => (
                <CompanyCard
                  key={c.id}
                  company={c}
                  onConnect={() => me ? setTarget(c) : window.location.href = '/auth/login'}
                  isOwn={me?.id === c.user_id}
                  isConnected={connected.includes(c.user_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer/>
      {target && <ConnectionModal target={target} targetType="company" onClose={() => setTarget(null)}/>}
    </>
  )
}

function CompanyCard({ company: c, onConnect, isOwn, isConnected }: any) {
  return (
    <div className="card-hover">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 border border-[#D8D4CB] flex items-center justify-center">
          {c.logo_url
            ? <img src={c.logo_url} className="w-full h-full object-cover" alt={c.company_name}/>
            : <Building2 size={22} className="text-[#0F0F0F]/20"/>
          }
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontFamily:'var(--font-display)' }} className="font-bold text-base truncate">{c.company_name}</h3>
          <p className="text-sm text-[#0F0F0F]/60 truncate">{c.industry}</p>
        </div>
      </div>

      <p className="text-xs text-[#0F0F0F]/60 leading-relaxed mb-4 line-clamp-3">{c.description}</p>

      <div className="flex flex-wrap gap-3 text-xs text-[#0F0F0F]/50 mb-4">
        {c.location     && <span className="flex items-center gap-1"><MapPin size={11}/>{c.location}</span>}
        {c.company_size && <span className="flex items-center gap-1"><Building2 size={11}/>{c.company_size} emp.</span>}
        {c.website      && (
          <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#0F0F0F] transition-colors">
            <Globe size={11}/> Website
          </a>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/companies/${c.user_id}`} className="flex-1 text-center py-2 rounded-xl text-xs font-medium bg-[#D8D4CB] hover:bg-[#ccc8bf] transition-colors">
          View profile
        </Link>
        {!isOwn && (
          isConnected
            ? <Link href="/messages" className="flex-1 py-2 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center">
                Message
              </Link>
            : <button onClick={onConnect} className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#0F0F0F] text-[#EAE7E0] hover:bg-[#1A1A1A] transition-colors">
                Connect
              </button>
        )}
      </div>
    </div>
  )
}
