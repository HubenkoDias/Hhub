'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConnectionModal from '@/components/ConnectionModal'
import { MapPin, Clock, DollarSign, Linkedin, Github, CheckCircle, Award, X, Calendar, Briefcase, Star, MessageSquare } from 'lucide-react'
import { AVAIL_LABELS } from '@/lib/types'
import Link from 'next/link'

export default function SpecialistProfile() {
  const { userId } = useParams() as { userId: string }
  const [profile,   setProfile]   = useState<any>(null)
  const [certs,     setCerts]     = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [reviews,   setReviews]   = useState<any[]>([])
  const [avgRating, setAvgRating] = useState<number|null>(null)
  const [loading,   setLoading]   = useState(true)
  const [me,        setMe]        = useState<any>(null)
  const [connStatus, setConnStatus] = useState<'none'|'pending'|'accepted'>('none')
  const [modal,     setModal]     = useState(false)
  const [cert,       setCert]       = useState<any>(null)
  const [lightboxImg, setLightboxImg] = useState<string|null>(null)
  const [showReview,  setShowReview]  = useState(false)
  const [myRating,    setMyRating]    = useState(5)
  const [myComment,   setMyComment]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [myReview,    setMyReview]    = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setMe(data.user)
      // Load my existing review
      const { data: myRev } = await supabase.from('reviews').select('*').eq('reviewer_id', data.user.id).eq('target_id', userId).single()
      if (myRev) { setMyReview(myRev); setMyRating(myRev.rating); setMyComment(myRev.comment || '') }
      // Check connection status
      if (data.user) {
        const { data: conns } = await supabase
          .from('connection_requests')
          .select('status, sender_id, receiver_id')
          .or(`and(sender_id.eq.${data.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${data.user.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
        if (conns && conns.length > 0) setConnStatus(conns[0].status as any)
      }
    })

    // Support both UUID and slug in URL
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    const query = isUUID
      ? supabase.from('qa_profiles').select('*').eq('user_id', userId)
      : supabase.from('qa_profiles').select('*').eq('slug', userId)

    query.single().then(async ({ data, error }) => {
      if (error || !data) { setLoading(false); return }
      setProfile(data)
      const [{ data: cs }, { data: pf }, { data: revs }] = await Promise.all([
        supabase.from('certificates').select('*').eq('qa_profile_id', data.id),
        supabase.from('portfolio_items').select('*').eq('qa_profile_id', data.id).order('start_date', { ascending: false }),
        supabase.from('reviews').select('*').eq('target_id', userId).order('created_at', { ascending: false }),
      ])
      setCerts(cs || [])
      setPortfolio(pf || [])
      setReviews(revs || [])
      if (revs && revs.length > 0) {
        setAvgRating(revs.reduce((a: number, r: any) => a + r.rating, 0) / revs.length)
      }
      // Track view (don't await - fire and forget)
      supabase.auth.getSession().then(({ data: { session } }) => {
        supabase.from('profile_views').insert({
          profile_id: data.user_id,
          viewer_id: session?.user?.id || null
        }).then(() => {})
      })

      setLoading(false)
    })
  }, [userId])

  const submitReview = async () => {
    if (!me || !myComment.trim()) return
    setSubmitting(true)
    if (myReview) {
      await supabase.from('reviews').update({ rating: myRating, comment: myComment.trim() }).eq('id', myReview.id)
    } else {
      const { data: rev } = await supabase.from('reviews').insert({ reviewer_id: me.id, target_id: userId, rating: myRating, comment: myComment.trim() }).select().single()
      if (rev) setMyReview(rev)
    }
    const { data: revs } = await supabase.from('reviews').select('*').eq('target_id', userId).order('created_at', { ascending: false })
    setReviews(revs || [])
    if (revs?.length) setAvgRating(revs.reduce((a: number, r: any) => a + r.rating, 0) / revs.length)
    setShowReview(false); setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
  if (!profile) return <><Navbar/><div className="min-h-screen pt-24 flex items-center justify-center"><h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold">Profile not found</h1></div></>

  const isOwn = me?.id === userId

  const ConnectButton = () => {
    if (isOwn) return null
    if (connStatus === 'accepted') return (
      <Link href={`/messages?userId=${userId}`} className="btn-accent flex items-center gap-2"><MessageSquare size={16}/> Message</Link>
    )
    if (connStatus === 'pending') return (
      <button disabled className="btn-secondary opacity-60 cursor-not-allowed">Request sent…</button>
    )
    return (
      <button onClick={() => me ? setModal(true) : window.location.href='/auth/login'} className="btn-accent">Connect</button>
    )
  }

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        {/* Hero */}
        <div className="bg-[#0A0A0A] py-12">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-start gap-8">
            <button
              className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-[#1A1A1A] overflow-hidden border border-white/8 flex-shrink-0 flex items-center justify-center group relative"
              onClick={() => profile.photo_url && setLightboxImg(profile.photo_url)}
              style={{ cursor: profile.photo_url ? 'zoom-in' : 'default' }}>
              {profile.photo_url
                ? <>
                    <img src={profile.photo_url} className="w-full h-full object-cover" alt={profile.full_name}/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-3xl flex items-center justify-center">
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                    </div>
                  </>
                : <span style={{ fontFamily:'var(--font-display)' }} className="text-5xl font-bold text-white/20">{profile.full_name?.[0]||'?'}</span>
              }
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl md:text-4xl font-extrabold text-white">{profile.full_name}</h1>
                {profile.verification_status==='verified' && <span className="flex items-center gap-1 text-xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full"><CheckCircle size={11}/> Verified</span>}
              </div>
              <p className="text-white/55 text-lg mb-2">{profile.title}</p>
              {avgRating && (
                <div className="flex items-center gap-1.5 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}/>)}
                  <span className="text-white/45 text-sm ml-1">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-white/45 mb-5">
                {profile.location && <span className="flex items-center gap-1.5"><MapPin size={14}/>{profile.location}</span>}
                {profile.availability && <span className="flex items-center gap-1.5"><Clock size={14}/>{AVAIL_LABELS[profile.availability]}</span>}
                {profile.hourly_rate && <span className="flex items-center gap-1.5"><DollarSign size={14}/>${profile.hourly_rate}/hr</span>}
                {profile.years_experience>0 && <span>🏆 {profile.years_experience} years exp.</span>}
              </div>
              <div className="flex gap-3 flex-wrap">
                <ConnectButton/>
                {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-4 py-2.5 rounded-full text-sm hover:bg-white/14 transition-colors"><Linkedin size={15}/> LinkedIn</a>}
                {profile.github_url   && <a href={profile.github_url}   target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-4 py-2.5 rounded-full text-sm hover:bg-white/14 transition-colors"><Github size={15}/> GitHub</a>}
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
                  <p className="text-[#0F0F0F]/65 leading-relaxed text-sm">{profile.bio}</p>
                </div>
              )}
              {(profile.skills||[]).length > 0 && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Skills & Tools</h2>
                  <div className="flex flex-wrap gap-2">{profile.skills.map((s: string) => <span key={s} className="skill-pill">{s}</span>)}</div>
                </div>
              )}
              {portfolio.length > 0 && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Portfolio</h2>
                  <div className="space-y-4">
                    {portfolio.map(p => (
                      <div key={p.id} className="border-l-2 border-[#C8473A] pl-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">{p.title}</h3>
                            <p className="text-xs text-[#0F0F0F]/50">{p.company}</p>
                          </div>
                          <span className="text-xs text-[#0F0F0F]/35 font-mono">
                            {p.start_date ? new Date(p.start_date).getFullYear() : ''}{p.is_current ? ' — Present' : p.end_date ? ` — ${new Date(p.end_date).getFullYear()}` : ''}
                          </span>
                        </div>
                        {p.description && <p className="text-xs text-[#0F0F0F]/55 mt-2 leading-relaxed">{p.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {certs.length > 0 && (
                <div className="card">
                  <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">Certificates</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {certs.map(c => (
                      <button key={c.id} onClick={() => setCert(c)} className="text-left p-4 bg-[#F5F3EF] rounded-xl border border-[#ECEAE4] hover:border-[#111]/20 transition-all hover:-translate-y-0.5 hover:shadow-md group">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-[#0F0F0F]/6 rounded-xl flex items-center justify-center flex-shrink-0"><Award size={16} className="text-[#0F0F0F]/45"/></div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{c.name}</p>
                            <p className="text-xs text-[#0F0F0F]/45 truncate">{c.issuer}</p>
                            {c.issued_date && <p className="text-xs text-[#0F0F0F]/30 mt-0.5 flex items-center gap-1"><Calendar size={9}/>{new Date(c.issued_date).getFullYear()}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {reviews.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Reviews</h2>
                    {me && !isOwn && myRole === 'company' && (
                      <button onClick={() => setShowReview(!showReview)} className="text-sm text-[#C8473A] hover:underline font-medium">
                        {myReview ? 'Edit review' : '+ Write review'}
                      </button>
                    )}
                  </div>
                  {showReview && (
                    <div className="bg-[#F5F4F1] rounded-xl p-4 mb-4 space-y-3 border border-[#E8E6E1]">
                      <div>
                        <label className="label">Rating</label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} onClick={() => setMyRating(s)} className={`text-2xl transition-transform hover:scale-110 ${s <= myRating ? 'text-amber-400' : 'text-[#E8E6E1]'}`}>★</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label">Comment</label>
                        <textarea className="input resize-none h-20" value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Share your experience working with this specialist…"/>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={submitReview} disabled={submitting || !myComment.trim()} className="btn-primary text-xs px-4 py-2 disabled:opacity-50">{submitting ? 'Saving…' : myReview ? 'Update' : 'Submit'}</button>
                        <button onClick={() => setShowReview(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="border-b border-[#ECEAE4] pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          {[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[#0F0F0F]/15'}/>)}
                          <span className="text-xs text-[#0F0F0F]/35 font-mono ml-1">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="text-sm text-[#0F0F0F]/65 leading-relaxed">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  {profile.location        && <div className="flex items-center gap-2 text-[#0F0F0F]/65"><MapPin size={14} className="text-[#0F0F0F]/35 flex-shrink-0"/>{profile.location}</div>}
                  {profile.availability    && <div className="flex items-center gap-2 text-[#0F0F0F]/65"><Clock size={14} className="text-[#0F0F0F]/35 flex-shrink-0"/>{AVAIL_LABELS[profile.availability]}</div>}
                  {profile.hourly_rate     && <div className="flex items-center gap-2 text-[#0F0F0F]/65"><DollarSign size={14} className="text-[#0F0F0F]/35 flex-shrink-0"/>${profile.hourly_rate}/hour</div>}
                  {profile.years_experience>0 && <div className="flex items-center gap-2 text-[#0F0F0F]/65"><span className="text-[#0F0F0F]/35">🏆</span>{profile.years_experience} years experience</div>}
                </div>
              </div>
              <div className="card flex flex-col gap-2">
                <ConnectButton/>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer/>

      {modal && <ConnectionModal target={profile} targetType="qa" onClose={() => setModal(false)}/>}

      {/* Photo/cert lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center p-6" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-5 right-6 text-white/60 hover:text-white text-2xl leading-none transition-colors">✕</button>
          <img src={lightboxImg} className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl" alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {cert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCert(null)}/>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-fade-up">
            <button onClick={() => setCert(null)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[#EAE7E0] transition-colors"><X size={18}/></button>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 bg-[#0F0F0F]/5 rounded-2xl flex items-center justify-center flex-shrink-0"><Award size={28} className="text-[#0F0F0F]/35"/></div>
              <div><h2 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">{cert.name}</h2><p className="text-[#0F0F0F]/50 text-sm">{cert.issuer}</p></div>
            </div>
            {cert.image_url && (
              <button onClick={() => setLightboxImg(cert.image_url)} className="w-full mb-5 group relative block">
                <img src={cert.image_url} className="w-full rounded-2xl border border-[#ECEAE4] object-contain max-h-64 group-hover:opacity-90 transition-opacity" alt="Certificate"/>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full font-medium">Click to enlarge</span>
                </div>
              </button>
            )}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {cert.certificate_id && <div className="bg-[#F5F3EF] rounded-xl p-3"><p className="text-xs font-mono text-[#0F0F0F]/35 uppercase tracking-widest mb-1">Certificate ID</p><p className="text-sm font-mono font-medium">{cert.certificate_id}</p></div>}
              {cert.issued_date && <div className="bg-[#F5F3EF] rounded-xl p-3"><p className="text-xs font-mono text-[#0F0F0F]/35 uppercase tracking-widest mb-1">Issued</p><p className="text-sm font-medium">{new Date(cert.issued_date).toLocaleDateString('en-US',{year:'numeric',month:'long'})}</p></div>}
            </div>
            {cert.description && <><p className="text-xs font-mono text-[#0F0F0F]/35 uppercase tracking-widest mb-2">About</p><p className="text-sm text-[#0F0F0F]/65 leading-relaxed">{cert.description}</p></>}
          </div>
        </div>
      )}
    </>
  )
}
