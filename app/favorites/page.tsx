'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { Heart, MapPin, Clock, DollarSign, CheckCircle, Building2 } from 'lucide-react'
import { AVAIL_LABELS } from '@/lib/types'

export default function Favorites() {
  const router = useRouter()
  const [user,     setUser]     = useState<any>(null)
  const [qaFavs,   setQAFavs]   = useState<any[]>([])
  const [coFavs,   setCoFavs]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'qa'|'company'>('qa')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      const { data: favs } = await supabase.from('favorites').select('*').eq('user_id', data.user.id)
      if (favs) {
        const qaIds = favs.filter(f => f.target_type === 'qa').map(f => f.target_id)
        const coIds = favs.filter(f => f.target_type === 'company').map(f => f.target_id)
        if (qaIds.length) {
          const { data: qas } = await supabase.from('qa_profiles').select('*').in('user_id', qaIds)
          setQAFavs(qas || [])
        }
        if (coIds.length) {
          const { data: cos } = await supabase.from('company_profiles').select('*').in('user_id', coIds)
          setCoFavs(cos || [])
        }
      }
      setLoading(false)
    })
  }, [])

  const removeFav = async (targetId: string, targetType: string) => {
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('target_id', targetId).eq('target_type', targetType)
    if (targetType === 'qa') setQAFavs(p => p.filter(x => x.user_id !== targetId))
    else setCoFavs(p => p.filter(x => x.user_id !== targetId))
  }

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Heart size={24} className="text-[#C8473A]"/>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold">Saved</h1>
          </div>

          <div className="flex gap-1 bg-[#D8D4CB] rounded-xl p-1 mb-8 w-fit">
            {(['qa','company'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${tab===t ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#0F0F0F]/60 hover:text-[#0F0F0F]'}`}>
                {t === 'qa' ? 'QA Specialists' : 'Companies'} ({t === 'qa' ? qaFavs.length : coFavs.length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : tab === 'qa' ? (
            qaFavs.length === 0 ? (
              <div className="card text-center py-16"><Heart size={32} className="text-[#0F0F0F]/20 mx-auto mb-3"/><p className="font-mono text-sm text-[#0F0F0F]/40">No saved specialists yet</p><Link href="/browse/specialists" className="btn-primary mt-4 inline-flex">Browse specialists</Link></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {qaFavs.map(s => (
                  <div key={s.id} className="card-hover relative">
                    <button onClick={() => removeFav(s.user_id, 'qa')} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Heart size={16} className="text-[#C8473A] fill-[#C8473A]"/>
                    </button>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" alt=""/> : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30">{s.full_name?.[0]}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5"><p className="font-semibold text-sm">{s.full_name}</p><CheckCircle size={13} className="text-emerald-600"/></div>
                        <p className="text-xs text-[#0F0F0F]/50">{s.title}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-[#0F0F0F]/50 mb-3">
                      {s.location && <span className="flex items-center gap-1"><MapPin size={10}/>{s.location}</span>}
                      {s.hourly_rate && <span className="flex items-center gap-1"><DollarSign size={10}/>${s.hourly_rate}/hr</span>}
                    </div>
                    <Link href={`/specialists/${s.user_id}`} className="w-full text-center py-2 rounded-xl text-xs font-medium bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors block">View profile</Link>
                  </div>
                ))}
              </div>
            )
          ) : (
            coFavs.length === 0 ? (
              <div className="card text-center py-16"><Heart size={32} className="text-[#0F0F0F]/20 mx-auto mb-3"/><p className="font-mono text-sm text-[#0F0F0F]/40">No saved companies yet</p><Link href="/browse/companies" className="btn-primary mt-4 inline-flex">Browse companies</Link></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {coFavs.map(c => (
                  <div key={c.id} className="card-hover relative">
                    <button onClick={() => removeFav(c.user_id, 'company')} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Heart size={16} className="text-[#C8473A] fill-[#C8473A]"/>
                    </button>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={20} className="text-[#0F0F0F]/20"/>}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{c.company_name}</p>
                        <p className="text-xs text-[#0F0F0F]/50">{c.industry}</p>
                      </div>
                    </div>
                    <Link href={`/companies/${c.user_id}`} className="w-full text-center py-2 rounded-xl text-xs font-medium bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors block">View profile</Link>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
      <Footer/>
    </>
  )
}
