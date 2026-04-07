'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { CheckCircle, XCircle, Clock, Users, Building2, FileText, Eye } from 'lucide-react'

export default function Admin() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('verify')
  const [pending,  setPending]  = useState<any[]>([])
  const [allQA,    setAllQA]    = useState<any[]>([])
  const [allCo,    setAllCo]    = useState<any[]>([])
  const [posts,    setPosts]    = useState<any[]>([])
  const [stats,    setStats]    = useState({ qa:0, verified:0, co:0, posts:0 })
  const [notes,    setNotes]    = useState<Record<string,string>>({})
  const [busy,     setBusy]     = useState<string|null>(null)
  const [newPost,  setNewPost]  = useState({ title:'', excerpt:'', content:'', category:'article' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
      if (p?.role !== 'admin') { router.push('/'); return }
      await load(); setLoading(false)
    })
  }, [])

  const load = async () => {
    const [{ data: pend }, { data: qa }, { data: co }, { data: ps }] = await Promise.all([
      supabase.from('qa_profiles').select('*').eq('verification_status','pending'),
      supabase.from('qa_profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('company_profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('blog_posts').select('*').order('created_at', { ascending:false }),
    ])
    setPending(pend||[]); setAllQA(qa||[]); setAllCo(co||[]); setPosts(ps||[])
    setStats({ qa: qa?.length||0, verified: qa?.filter(q=>q.verification_status==='verified').length||0, co: co?.length||0, posts: ps?.length||0 })
  }

  const verify = async (id: string, status: 'verified'|'rejected') => {
    setBusy(id)
    await supabase.from('qa_profiles').update({ verification_status: status, verification_note: notes[id]||null }).eq('id', id)
    await load(); setBusy(null)
  }

  const togglePost = async (id: string, published: boolean) => {
    await supabase.from('blog_posts').update({ published: !published }).eq('id', id)
    await load()
  }

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    await load()
  }

  const createPost = async () => {
    if (!newPost.title || !newPost.content) return
    setSaving(true)
    const slug = newPost.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    await supabase.from('blog_posts').insert({ ...newPost, slug, published: false })
    setNewPost({ title:'', excerpt:'', content:'', category:'article' })
    await load(); setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-[#0F0F0F]/60 text-sm mt-1">Manage HHub platform</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[{label:'Total QA',value:stats.qa,icon:Users},{label:'Verified QA',value:stats.verified,icon:CheckCircle},{label:'Companies',value:stats.co,icon:Building2},{label:'Blog posts',value:stats.posts,icon:FileText}].map(({ label, value, icon:Icon }) => (
              <div key={label} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#0F0F0F]/50 uppercase tracking-widest">{label}</span>
                  <Icon size={16} className="text-[#0F0F0F]/30"/>
                </div>
                <div style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#D8D4CB] rounded-xl p-1 mb-8 w-fit">
            {['verify','specialists','companies','blog'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${tab===t ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#0F0F0F]/60 hover:text-[#0F0F0F]'}`}>
                {t==='verify' ? 'Verification' : t}
                {t==='verify' && pending.length>0 && <span className="ml-2 bg-[#C8473A] text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">{pending.length}</span>}
              </button>
            ))}
          </div>

          {/* VERIFY */}
          {tab==='verify' && (
            <div className="space-y-4">
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Pending ({pending.length})</h2>
              {pending.length===0
                ? <div className="card text-center py-12 text-[#0F0F0F]/40"><p className="font-mono text-sm">All caught up! No pending reviews.</p></div>
                : pending.map(qa => (
                  <div key={qa.id} className="card">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30">{qa.full_name?.[0]}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{qa.full_name||'No name'}</h3>
                            <p className="text-sm text-[#0F0F0F]/60">{qa.title||'No title'}</p>
                            <p className="text-xs text-[#0F0F0F]/40 mt-1">{qa.location} · {qa.years_experience} yrs · {qa.availability}</p>
                          </div>
                          <a href={`/specialists/${qa.user_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#0F0F0F]/50 hover:text-[#0F0F0F] transition-colors">
                            <Eye size={13}/> View
                          </a>
                        </div>
                        {(qa.skills||[]).length>0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {qa.skills.slice(0,6).map((s: string) => <span key={s} className="skill-tag">{s}</span>)}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          <input className="input text-sm flex-1" placeholder="Rejection reason (optional)" value={notes[qa.id]||''} onChange={e => setNotes(p => ({...p,[qa.id]:e.target.value}))}/>
                          <div className="flex gap-2">
                            <button onClick={() => verify(qa.id,'verified')} disabled={busy===qa.id} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <CheckCircle size={15}/> Verify
                            </button>
                            <button onClick={() => verify(qa.id,'rejected')} disabled={busy===qa.id} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                              <XCircle size={15}/> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ALL QA */}
          {tab==='specialists' && (
            <div className="space-y-3">
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All QA ({allQA.length})</h2>
              {allQA.map(qa => (
                <div key={qa.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D8D4CB] overflow-hidden flex items-center justify-center">
                      {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-sm">{qa.full_name?.[0]}</span>}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{qa.full_name||'No name'}</p>
                      <p className="text-xs text-[#0F0F0F]/50">{qa.title} · {qa.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {qa.verification_status==='verified'  && <span className="badge-verified"><CheckCircle size={11}/> Verified</span>}
                    {qa.verification_status==='pending'   && <span className="badge-pending"><Clock size={11}/> Pending</span>}
                    {qa.verification_status==='rejected'  && <span className="badge-rejected"><XCircle size={11}/> Rejected</span>}
                    <a href={`/specialists/${qa.user_id}`} target="_blank" rel="noopener noreferrer" className="text-[#0F0F0F]/40 hover:text-[#0F0F0F] transition-colors"><Eye size={16}/></a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ALL COMPANIES */}
          {tab==='companies' && (
            <div className="space-y-3">
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All Companies ({allCo.length})</h2>
              {allCo.map(c => (
                <div key={c.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D8D4CB] overflow-hidden flex items-center justify-center">
                      {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={18} className="text-[#0F0F0F]/30"/>}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.company_name||'No name'}</p>
                      <p className="text-xs text-[#0F0F0F]/50">{c.industry} · {c.location}</p>
                    </div>
                  </div>
                  <a href={`/companies/${c.user_id}`} target="_blank" rel="noopener noreferrer" className="text-[#0F0F0F]/40 hover:text-[#0F0F0F] transition-colors"><Eye size={16}/></a>
                </div>
              ))}
            </div>
          )}

          {/* BLOG */}
          {tab==='blog' && (
            <div className="space-y-6">
              <div className="card">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">New post</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Title</label><input className="input" value={newPost.title} onChange={e=>setNewPost({...newPost,title:e.target.value})} placeholder="Post title"/></div>
                    <div>
                      <label className="label">Category</label>
                      <select className="input" value={newPost.category} onChange={e=>setNewPost({...newPost,category:e.target.value})}>
                        <option value="article">Article</option>
                        <option value="guide">Guide</option>
                        <option value="interview">Interview</option>
                        <option value="case-study">Case Study</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Excerpt</label><input className="input" value={newPost.excerpt} onChange={e=>setNewPost({...newPost,excerpt:e.target.value})} placeholder="Short description for cards"/></div>
                  <div><label className="label">Content</label><textarea className="input resize-none h-40" value={newPost.content} onChange={e=>setNewPost({...newPost,content:e.target.value})} placeholder="Write your post…"/></div>
                  <button onClick={createPost} disabled={saving||!newPost.title||!newPost.content} className="btn-accent disabled:opacity-50">{saving?'Saving…':'Create draft'}</button>
                </div>
              </div>

              <div className="space-y-3">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All posts ({posts.length})</h2>
                {posts.map(p => (
                  <div key={p.id} className="card flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-black/10 px-2 py-0.5 rounded-full capitalize">{p.category}</span>
                        {p.published ? <span className="text-xs font-mono text-emerald-600">● Published</span> : <span className="text-xs font-mono text-[#0F0F0F]/40">● Draft</span>}
                      </div>
                      <p className="font-medium text-sm truncate">{p.title}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => togglePost(p.id, p.published)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.published ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {p.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deletePost(p.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
