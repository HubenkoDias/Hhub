'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { MapPin, Globe, Building2, Mail, Star, Users, Briefcase, ExternalLink, MessageSquare } from 'lucide-react'

export default function CompanyProfile() {
  const { userId } = useParams() as { userId: string }
  const router     = useRouter()
  const [profile,  setProfile]  = useState<any>(null)
  const [jobs,     setJobs]     = useState<any[]>([])
  const [reviews,  setReviews]  = useState<any[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [me,       setMe]       = useState<any>(null)
  const [myRole,   setMyRole]   = useState<string|null>(null)
  const [connStatus, setConnStatus] = useState<'none'|'pending'|'accepted'>('none')
  const [lightbox, setLightbox] = useState<string|null>(null)
  // Review form
  const [showReview, setShowReview] = useState(false)
  const [myRating,   setMyRating]   = useState(5)
  const [myComment,  setMyComment]  = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myReview,   setMyReview]   = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setMe(session.user)
        const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
        if (p) setMyRole(p.role)
        // Check connection
        const { data: conns } = await supabase.from('connection_requests').select('status')
          .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${session.user.id})`)
          .order('created_at', { ascending: false }).limit(1)
        if (conns && conns[0]) setConnStatus(conns[0].status as any)
        // My existing review
        const { data: myRev } = await supabase.from('reviews').select('*').eq('reviewer_id', session.user.id).eq('target_id', userId).single()
        if (myRev) { setMyReview(myRev); setMyRating(myRev.rating); setMyComment(myRev.comment || '') }
      }
    })

    // Load company
    supabase.from('company_profiles').select('*').eq('user_id', userId).single().then(async ({ data }) => {
      if (!data) { setLoading(false); return }
      setProfile(data)

      const [{ data: jobsData }, { data: revs }] = await Promise.all([
        supabase.from('job_postings').select('*').eq('company_id', userId).eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').eq('target_id', userId).order('created_at', { ascending: false }),
      ])
      setJobs(jobsData || [])
      setReviews(revs || [])
      if (revs && revs.length > 0) {
        setAvgRating(revs.reduce((a: number, r: any) => a + r.rating, 0) / revs.length)
      }

      // Track profile view
      supabase.from('profile_views').insert({ profile_id: userId }).then(() => {})
      setLoading(false)
    })
  }, [userId])

  const submitReview = async () => {
    if (!me || !myComment.trim()) return
    setSubmitting(true)
    if (myReview) {
      await supabase.from('reviews').update({ rating: myRating, comment: myComment.trim() }).eq('id', myReview.id)
    } else {
      await supabase.from('reviews').insert({ reviewer_id: me.id, target_id: userId, rating: myRating, comment: myComment.trim() })
    }
    // Reload reviews
    const { data: revs } = await supabase.from('reviews').select('*').eq('target_id', userId).order('created_at', { ascending: false })
    setReviews(revs || [])
    if (revs?.length) setAvgRating(revs.reduce((a: number, r: any) => a + r.rating, 0) / revs.length)
    setShowReview(false); setSubmitting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin"/></div>
  if (!profile) return <><Navbar/><div className="min-h-screen pt-14 flex items-center justify-center"><p className="text-[#111]/40 text-sm font-mono">Company not found</p></div></>

  const isOwn = me?.id === userId

  return (
    <>
      <Navbar/>
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/92 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-6 text-white/60 hover:text-white text-2xl">✕</button>
          <img src={lightbox} className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl" alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="min-h-screen bg-[#F5F4F1] pt-16">
        {/* Hero */}
        <div className="bg-[#0A0A0A] py-12">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-start gap-8">
            <button
              className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-[#1A1A1A] border border-white/8 overflow-hidden flex-shrink-0 flex items-center justify-center group relative"
              onClick={() => profile.logo_url && setLightbox(profile.logo_url)}
              style={{ cursor: profile.logo_url ? 'zoom-in' : 'default' }}>
              {profile.logo_url
                ? <img src={profile.logo_url} className="w-full h-full object-cover" alt={profile.company_name} />
                : <Building2 size={36} className="text-white/15" />
              }
            </button>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{profile.company_name}</h1>
              {profile.industry && <p className="text-white/50 mb-2">{profile.industry}</p>}
              {avgRating && (
                <div className="flex items-center gap-1.5 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}/>)}
                  <span className="text-white/45 text-sm ml-1">{avgRating.toFixed(1)} ({reviews.length})</span>
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-white/45 mb-5">
                {profile.location      && <span className="flex items-center gap-1.5"><MapPin size={13}/>{profile.location}</span>}
                {profile.company_size  && <span className="flex items-center gap-1.5"><Users size={13}/>{profile.company_size} employees</span>}
                {jobs.length > 0       && <span className="flex items-center gap-1.5"><Briefcase size={13}/>{jobs.length} open role{jobs.length !== 1 ? 's' : ''}</span>}
              </div>
              <div className="flex gap-3 flex-wrap">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-4 py-2 rounded-full text-sm hover:bg-white/14 transition-colors">
                    <Globe size={14}/> Website <ExternalLink size={11}/>
                  </a>
                )}
                {connStatus === 'accepted' && (
                  <Link href={`/messages?userId=${userId}`}
                    className="inline-flex items-center gap-2 bg-[#C8473A] text-white px-4 py-2 rounded-full text-sm hover:bg-[#B33D31] transition-colors">
                    <MessageSquare size={14}/> Message
                  </Link>
                )}
                {profile.contact_email && (
                  <a href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-4 py-2 rounded-full text-sm hover:bg-white/14 transition-colors">
                    <Mail size={14}/> Contact
                  </a>
                )}
                {isOwn && <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-4 py-2 rounded-full text-sm hover:bg-white/14 transition-colors">Edit profile</Link>}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              {profile.description && (
                <div className="card">
                  <h2 className="font-semibold mb-3">About</h2>
                  <p className="text-sm text-[#111]/70 leading-relaxed">{profile.description}</p>
                </div>
              )}

              {/* Open jobs */}
              {jobs.length > 0 && (
                <div className="card">
                  <h2 className="font-semibold mb-4">Open positions ({jobs.length})</h2>
                  <div className="space-y-3">
                    {jobs.map(j => (
                      <Link key={j.id} href={`/jobs/${j.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F5F4F1] hover:bg-[#F0EDE8] border border-[#E8E6E1] transition-colors">
                        <div>
                          <p className="font-medium text-sm">{j.title}</p>
                          <div className="flex gap-3 mt-0.5 text-xs text-[#111]/40">
                            {j.remote && <span className="text-emerald-600">Remote</span>}
                            {j.employment_type && <span className="capitalize">{j.employment_type}</span>}
                            {(j.salary_min || j.salary_max) && <span>${j.salary_min || '?'}–${j.salary_max || '?'}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-[#C8473A] font-medium">Apply →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
                  {me && !isOwn && (
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
                          <button key={s} onClick={() => setMyRating(s)}
                            className={`text-2xl transition-transform hover:scale-110 ${s <= myRating ? 'text-amber-400' : 'text-[#E8E6E1]'}`}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Comment</label>
                      <textarea className="input resize-none h-20" value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Share your experience…"/>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={submitReview} disabled={submitting || !myComment.trim()} className="btn-primary text-xs px-4 py-2 disabled:opacity-50">
                        {submitting ? 'Saving…' : myReview ? 'Update' : 'Submit'}
                      </button>
                      <button onClick={() => setShowReview(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                    </div>
                  </div>
                )}

                {reviews.length === 0 ? (
                  <p className="text-sm text-[#111]/35 text-center py-4">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="border-b border-[#F0EDE8] pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {[1,2,3,4,5].map(s => <Star key={s} size={13} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[#111]/15'}/>)}
                          <span className="text-xs text-[#111]/30 font-mono ml-1">{new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
                        </div>
                        <p className="text-sm text-[#111]/70 leading-relaxed">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="card space-y-3">
                <h3 className="font-semibold text-sm">Details</h3>
                {profile.location     && <div className="flex items-center gap-2 text-sm text-[#111]/65"><MapPin size={14} className="text-[#111]/35 flex-shrink-0"/>{profile.location}</div>}
                {profile.company_size && <div className="flex items-center gap-2 text-sm text-[#111]/65"><Users size={14} className="text-[#111]/35 flex-shrink-0"/>{profile.company_size} employees</div>}
                {profile.industry     && <div className="flex items-center gap-2 text-sm text-[#111]/65"><Building2 size={14} className="text-[#111]/35 flex-shrink-0"/>{profile.industry}</div>}
                {profile.website      && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe size={14} className="text-[#111]/35 flex-shrink-0"/>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[#C8473A] hover:underline truncate">{profile.website.replace(/^https?:\/\//, '')}</a>
                  </div>
                )}
                {profile.contact_email && <div className="flex items-center gap-2 text-sm text-[#111]/65"><Mail size={14} className="text-[#111]/35 flex-shrink-0"/>{profile.contact_email}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
