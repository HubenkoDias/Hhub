'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { CheckCircle, XCircle, Clock, Users, Building2, FileText, Eye, Trash2, Shield, ShieldOff, Ban } from 'lucide-react'

export default function Admin() {
  const router = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('verify')
  const [pending,  setPending]  = useState<any[]>([])
  const [allQA,    setAllQA]    = useState<any[]>([])
  const [allCo,    setAllCo]    = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [posts,    setPosts]    = useState<any[]>([])
  const [stats,    setStats]    = useState({ qa:0, verified:0, co:0, posts:0, users:0 })
  const [notes,    setNotes]    = useState<Record<string,string>>({})
  const [busy,     setBusy]     = useState<string|null>(null)
  const [newPost,  setNewPost]  = useState({ title:'', excerpt:'', content:'', category:'article' })
  const [saving,   setSaving]   = useState(false)
  const [confirm,  setConfirm]  = useState<string|null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [newMember, setNewMember] = useState({ name:'', role:'', linkedin_url:'' })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
      if (p?.role !== 'admin') { router.push('/'); return }
      await load(); setLoading(false)
    })
  }, [])

  const load = async () => {
    const [{ data: pend }, { data: qa }, { data: co }, { data: ps }, { data: users }, { data: team }] = await Promise.all([
      supabase.from('qa_profiles').select('*').eq('verification_status','pending'),
      supabase.from('qa_profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('company_profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('blog_posts').select('*').order('created_at', { ascending:false }),
      supabase.from('profiles').select('*').order('created_at', { ascending:false }),
      supabase.from('team_members').select('*').order('sort_order'),
    ])
    setPending(pend||[]); setAllQA(qa||[]); setAllCo(co||[]); setPosts(ps||[]); setAllUsers(users||[]); setTeamMembers(team||[])
    setStats({ qa: qa?.length||0, verified: qa?.filter(q=>q.verification_status==='verified').length||0, co: co?.length||0, posts: ps?.length||0, users: users?.length||0 })
  }

  const verify = async (id: string, status: 'verified'|'rejected') => {
    setBusy(id)
    await supabase.from('qa_profiles').update({ verification_status: status, verification_note: notes[id]||null }).eq('id', id)
    // Notify user
    const qa = pending.find(q => q.id === id)
    if (qa) {
      await supabase.from('notifications').insert({
        user_id: qa.user_id,
        type: 'verification',
        title: status === 'verified' ? '✓ Profile verified!' : 'Profile not approved',
        message: status === 'verified' ? 'Your profile is now live and visible to companies.' : (notes[id] || 'Please update your profile and resubmit.'),
        link: '/dashboard',
      })
    }
    await load(); setBusy(null)
  }

  const removeVerification = async (id: string) => {
    setBusy(id)
    await supabase.from('qa_profiles').update({ verification_status: 'pending', verification_note: null }).eq('id', id)
    await load(); setBusy(null)
  }

  const deleteQA = async (id: string, userId: string) => {
    if (confirm !== id) { setConfirm(id); return }
    setBusy(id)
    await supabase.from('qa_profiles').delete().eq('id', id)
    await load(); setBusy(null); setConfirm(null)
  }

  const deleteCo = async (id: string) => {
    if (confirm !== id) { setConfirm(id); return }
    setBusy(id)
    await supabase.from('company_profiles').delete().eq('id', id)
    await load(); setBusy(null); setConfirm(null)
  }

  const changeRole = async (userId: string, newRole: string) => {
    setBusy(userId)
    await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId)
    await load(); setBusy(null)
  }

  const deleteUser = async (userId: string) => {
    if (confirm !== userId) { setConfirm(userId); return }
    setBusy(userId)
    const { data: { user } } = await supabase.auth.getUser()
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, requesterId: user?.id }),
    })
    await load(); setBusy(null); setConfirm(null)
  }

  const togglePost = async (id: string, published: boolean) => {
    await supabase.from('blog_posts').update({ published: !published }).eq('id', id); await load()
  }

  const deletePost = async (id: string) => {
    if (!confirm) { setConfirm(id); return }
    await supabase.from('blog_posts').delete().eq('id', id); await load(); setConfirm(null)
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

  const TABS = [
    { id:'verify',      label:'Verification', badge: pending.length },
    { id:'specialists', label:'QA Specialists' },
    { id:'companies',   label:'Companies' },
    { id:'users',       label:'All Users' },
    { id:'blog',        label:'Blog' },
    { id:'team',        label:'Team' },
  ]

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold flex items-center gap-3"><Shield size={28} className="text-[#C8473A]"/> Admin Panel</h1>
            <p className="text-[#0F0F0F]/50 text-sm mt-1">Full platform control</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[{l:'Total QA',v:stats.qa},{l:'Verified QA',v:stats.verified},{l:'Companies',v:stats.co},{l:'Users',v:stats.users},{l:'Posts',v:stats.posts}].map(({ l, v }) => (
              <div key={l} className="card text-center">
                <div style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold mb-1">{v}</div>
                <div className="text-xs font-mono text-[#0F0F0F]/40 uppercase tracking-widest">{l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#D8D4CB] rounded-xl p-1 mb-8 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${tab===t.id ? 'bg-white text-[#0F0F0F] shadow-sm' : 'text-[#0F0F0F]/60 hover:text-[#0F0F0F]'}`}>
                {t.label}
                {t.badge ? <span className="bg-[#C8473A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* VERIFY */}
          {tab==='verify' && (
            <div className="space-y-4">
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Pending verification ({pending.length})</h2>
              {pending.length===0
                ? <div className="card text-center py-12 text-[#0F0F0F]/40"><CheckCircle size={32} className="mx-auto mb-3 opacity-30"/><p className="font-mono text-sm">All caught up!</p></div>
                : pending.map(qa => (
                  <div key={qa.id} className="card">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#EAE7E0] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-lg">{qa.full_name?.[0]}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{qa.full_name||'No name'}</h3>
                            <p className="text-sm text-[#0F0F0F]/55">{qa.title||'No title'}</p>
                            <p className="text-xs text-[#0F0F0F]/40 mt-0.5">{[qa.location, qa.years_experience && `${qa.years_experience} yrs`, qa.availability].filter(Boolean).join(' · ')}</p>
                          </div>
                          <a href={`/specialists/${qa.user_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#0F0F0F]/40 hover:text-[#0F0F0F] transition-colors bg-[#EAE7E0] px-3 py-1.5 rounded-lg">
                            <Eye size={13}/> View profile
                          </a>
                        </div>
                        {(qa.skills||[]).length>0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {qa.skills.slice(0,8).map((s: string) => <span key={s} className="skill-pill text-xs">{s}</span>)}
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input className="input text-sm flex-1" placeholder="Rejection reason (optional)" value={notes[qa.id]||''} onChange={e => setNotes(p => ({...p,[qa.id]:e.target.value}))}/>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => verify(qa.id,'verified')} disabled={busy===qa.id} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                              <CheckCircle size={15}/> Verify
                            </button>
                            <button onClick={() => verify(qa.id,'rejected')} disabled={busy===qa.id} className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
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
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All QA Specialists ({allQA.length})</h2>
              {allQA.map(qa => (
                <div key={qa.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAE7E0] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-sm">{qa.full_name?.[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{qa.full_name||'No name'}</p>
                    <p className="text-xs text-[#0F0F0F]/45 truncate">{qa.title} · {qa.location}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {qa.verification_status==='verified'  && <span className="badge-verified"><CheckCircle size={11}/> Verified</span>}
                    {qa.verification_status==='pending'   && <span className="badge-pending"><Clock size={11}/> Pending</span>}
                    {qa.verification_status==='rejected'  && <span className="badge-rejected"><XCircle size={11}/> Rejected</span>}
                    <a href={`/specialists/${qa.user_id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[#EAE7E0] transition-colors text-[#0F0F0F]/40 hover:text-[#0F0F0F]"><Eye size={15}/></a>
                    {qa.verification_status==='verified' && (
                      <button onClick={() => removeVerification(qa.id)} disabled={busy===qa.id} title="Remove verification" className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-amber-600"><ShieldOff size={15}/></button>
                    )}
                    <button onClick={() => deleteQA(qa.id, qa.user_id)} disabled={busy===qa.id} title={confirm===qa.id ? 'Click again to confirm' : 'Delete profile'}
                      className={`p-1.5 rounded-lg transition-colors ${confirm===qa.id ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-red-500'}`}>
                      <Trash2 size={15}/>
                    </button>
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
                <div key={c.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAE7E0] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {c.logo_url ? <img src={c.logo_url} className="w-full h-full object-cover" alt=""/> : <Building2 size={18} className="text-[#0F0F0F]/25"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.company_name||'No name'}</p>
                    <p className="text-xs text-[#0F0F0F]/45 truncate">{c.industry} · {c.location}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`/companies/${c.user_id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[#EAE7E0] transition-colors text-[#0F0F0F]/40"><Eye size={15}/></a>
                    <button onClick={() => deleteCo(c.id)} disabled={busy===c.id}
                      className={`p-1.5 rounded-lg transition-colors ${confirm===c.id ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-red-500'}`}>
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ALL USERS */}
          {tab==='users' && (
            <div className="space-y-3">
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All Users ({allUsers.length})</h2>
              {allUsers.map(u => (
                <div key={u.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAE7E0] flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-[#0F0F0F]/30"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-[#0F0F0F]/40 truncate">{u.user_id}</p>
                    <p className="text-xs text-[#0F0F0F]/50 mt-0.5">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${u.role==='admin' ? 'bg-purple-50 text-purple-700' : u.role==='company' ? 'bg-blue-50 text-blue-700' : 'bg-[#EAE7E0] text-[#0F0F0F]/60'}`}>
                      {u.role}
                    </span>
                    <select value={u.role} onChange={e => changeRole(u.user_id, e.target.value)} disabled={busy===u.user_id}
                      className="text-xs border border-[#D8D4CB] rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                      <option value="qa">QA</option>
                      <option value="company">Company</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => deleteUser(u.user_id)} disabled={busy===u.user_id}
                      title={confirm===u.user_id ? 'Click again to confirm delete' : 'Delete user & all data'}
                      className={`p-1.5 rounded-lg transition-colors ${confirm===u.user_id ? 'bg-red-600 text-white' : 'hover:bg-red-50 text-red-400'}`}>
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BLOG */}
          {tab==='blog' && (
            <div className="space-y-6">
              <div className="card">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-5">New post</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Title</label><input className="input" value={newPost.title} onChange={e => setNewPost({...newPost,title:e.target.value})} placeholder="Post title"/></div>
                    <div>
                      <label className="label">Category</label>
                      <select className="input" value={newPost.category} onChange={e => setNewPost({...newPost,category:e.target.value})}>
                        <option value="article">Article</option><option value="guide">Guide</option>
                        <option value="interview">Interview</option><option value="case-study">Case Study</option>
                      </select>
                    </div>
                  </div>
                  <div><label className="label">Excerpt</label><input className="input" value={newPost.excerpt} onChange={e => setNewPost({...newPost,excerpt:e.target.value})} placeholder="Short description for cards"/></div>
                  <div><label className="label">Content</label><textarea className="input resize-none h-40" value={newPost.content} onChange={e => setNewPost({...newPost,content:e.target.value})} placeholder="Write your post…"/></div>
                  <button onClick={createPost} disabled={saving||!newPost.title||!newPost.content} className="btn-accent disabled:opacity-50">{saving?'Saving…':'Create draft'}</button>
                </div>
              </div>
              <div className="space-y-3">
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">All posts ({posts.length})</h2>
                {posts.map(p => (
                  <div key={p.id} className="card flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-[#EAE7E0] px-2 py-0.5 rounded-full capitalize">{p.category}</span>
                        {p.published ? <span className="text-xs font-mono text-emerald-600">● Published</span> : <span className="text-xs font-mono text-[#0F0F0F]/35">● Draft</span>}
                      </div>
                      <p className="font-medium text-sm truncate">{p.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePost(p.id, p.published)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.published ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {p.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deletePost(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${confirm===p.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        {confirm===p.id ? 'Confirm' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* TEAM */}
          {tab==='team' && (
            <TeamTab teamMembers={teamMembers} onReload={load} />
          )}

        </div>
      </div>
    </>
  )
}

// ─── Team Tab Component ───────────────────────────────────────────────────────
function TeamTab({ teamMembers, onReload }: { teamMembers: any[], onReload: () => void }) {
  const [editing,   setEditing]   = useState<string|null>(null)
  const [editData,  setEditData]  = useState<any>({})
  const [newMember, setNewMember] = useState({ name:'', role:'', linkedin_url:'' })
  const [saving,    setSaving]    = useState(false)
  const [adding,    setAdding]    = useState(false)
  const [deleting,  setDeleting]  = useState<string|null>(null)

  const startEdit = (m: any) => {
    setEditing(m.id)
    setEditData({ name: m.name, role: m.role, linkedin_url: m.linkedin_url || '' })
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    await supabase.from('team_members').update({
      name: editData.name,
      role: editData.role,
      linkedin_url: editData.linkedin_url || null,
    }).eq('id', id)
    setEditing(null)
    setSaving(false)
    onReload()
  }

  const addMember = async () => {
    if (!newMember.name.trim() || !newMember.role.trim()) return
    setAdding(true)
    await supabase.from('team_members').insert({
      name: newMember.name.trim(),
      role: newMember.role.trim(),
      linkedin_url: newMember.linkedin_url.trim() || null,
      sort_order: teamMembers.length,
    })
    setNewMember({ name:'', role:'', linkedin_url:'' })
    setAdding(false)
    onReload()
  }

  const deleteMember = async (id: string) => {
    if (deleting !== id) { setDeleting(id); return }
    await supabase.from('team_members').delete().eq('id', id)
    setDeleting(null)
    onReload()
  }

  return (
    <div className="space-y-6">
      {/* Add new member */}
      <div className="card">
        <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-5">Add team member</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Full name *</label>
            <input className="input" value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              placeholder="John Smith"
              onKeyDown={e => e.key === 'Enter' && addMember()}
            />
          </div>
          <div>
            <label className="label">Role / Position *</label>
            <input className="input" value={newMember.role}
              onChange={e => setNewMember({ ...newMember, role: e.target.value })}
              placeholder="QA Lead"
              onKeyDown={e => e.key === 'Enter' && addMember()}
            />
          </div>
          <div>
            <label className="label">LinkedIn URL</label>
            <input className="input" value={newMember.linkedin_url}
              onChange={e => setNewMember({ ...newMember, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
        </div>
        <button
          onClick={addMember}
          disabled={adding || !newMember.name.trim() || !newMember.role.trim()}
          className="btn-accent disabled:opacity-50"
        >
          {adding ? 'Adding…' : '+ Add member'}
        </button>
      </div>

      {/* Members list */}
      <div>
        <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-4">
          Team members ({teamMembers.length})
        </h2>

        {teamMembers.length === 0 && (
          <div className="card text-center py-12 text-[#0F0F0F]/40">
            <p className="font-mono text-sm">No team members yet. Add the first one above.</p>
          </div>
        )}

        <div className="space-y-3">
          {teamMembers.map(m => (
            <div key={m.id} className="card border border-[#ECEAE4]">
              {editing === m.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Name</label>
                      <input className="input" value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <input className="input" value={editData.role}
                        onChange={e => setEditData({ ...editData, role: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">LinkedIn URL</label>
                      <input className="input" value={editData.linkedin_url}
                        onChange={e => setEditData({ ...editData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(m.id)} disabled={saving} className="btn-primary text-sm px-4 py-2">
                      {saving ? 'Saving…' : '✓ Save'}
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-sm px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#EAE7E0] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#ECEAE4]">
                    {m.photo_url
                      ? <img src={m.photo_url} className="w-full h-full object-cover" alt={m.name}/>
                      : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-sm">{m.name?.[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.name}</p>
                    <p className="text-xs text-[#0F0F0F]/45">{m.role}</p>
                    {m.linkedin_url && (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#0F0F0F]/35 hover:text-[#0F0F0F] transition-colors font-mono truncate block max-w-xs">
                        {m.linkedin_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(m)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMember(m.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        deleting === m.id
                          ? 'bg-red-600 text-white'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {deleting === m.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
