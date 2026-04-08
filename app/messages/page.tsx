'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Send, Paperclip, ImageIcon, ArrowLeft, Search, Plus, X, Users, Check, CheckCheck, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile { user_id: string; display_name: string; photo_url: string|null; sub: string; role: string }
interface ConvItem { id: string; other: UserProfile; last_content: string; last_time: string; unread: number; type: 'direct' }
interface GroupItem { id: string; name: string; description: string; member_count: number; last_content: string; last_time: string; type: 'group' }
type ChatItem = ConvItem | GroupItem

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchProfile(uid: string): Promise<UserProfile> {
  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', uid).single()
  if (p?.role === 'qa' || p?.role === 'admin') {
    const { data: q } = await supabase.from('qa_profiles').select('full_name,photo_url,title').eq('user_id', uid).single()
    return { user_id: uid, display_name: q?.full_name || 'QA Specialist', photo_url: q?.photo_url || null, sub: q?.title || '', role: p.role }
  }
  const { data: c } = await supabase.from('company_profiles').select('company_name,logo_url,industry').eq('user_id', uid).single()
  return { user_id: uid, display_name: c?.company_name || 'Company', photo_url: c?.logo_url || null, sub: c?.industry || '', role: 'company' }
}

function fmtTime(ts: string) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
  const y = new Date(now); y.setDate(now.getDate()-1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtDate(ts: string) {
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(now.getDate()-1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric' })
}

// Validate file type (security)
const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/png','image/gif','image/webp']
const ALLOWED_FILE_TYPES  = ['application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 10, online = false }: { name: string; photo: string|null; size?: number; online?: boolean }) {
  const s = `w-${size} h-${size}`
  return (
    <div className={`${s} rounded-lg bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center relative`}>
      {photo ? <img src={photo} className="w-full h-full object-cover" alt={name}/> : <span className="text-xs font-bold text-[#111]/30">{name?.[0]?.toUpperCase()}</span>}
      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"/>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function MessagesInner() {
  const router      = useRouter()
  const params      = useSearchParams()
  const openUserId  = params.get('userId')

  const [user,      setUser]      = useState<any>(null)
  const [role,      setRole]      = useState<string|null>(null)
  const [chats,     setChats]     = useState<ChatItem[]>([])
  const [active,    setActive]    = useState<any>(null) // { type:'direct'|'group', id, ...meta }
  const [msgs,      setMsgs]      = useState<any[]>([])
  const [text,      setText]      = useState('')
  const [pending,   setPending]   = useState<any[]>([])
  const [view,      setView]      = useState<'list'|'chat'|'requests'|'new-group'>('list')
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [online,    setOnline]    = useState<Set<string>>(new Set())
  const [qaList,    setQAList]    = useState<any[]>([])
  const [myGroupCount, setMyGroupCount] = useState(0)
  const [newGroup,  setNewGroup]  = useState({ name:'', description:'', members:[] as string[] })

  const endRef   = useRef<HTMLDivElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const imgRef   = useRef<HTMLInputElement>(null)

  // ── Init ──
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/login'); return }
      const u = session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', u.id).single()
      if (p) setRole(p.role)

      await Promise.all([loadChats(u.id), loadPending(u.id)])

      // Load QA list for group creation
      const { data: qas } = await supabase.from('qa_profiles').select('user_id,full_name,photo_url').eq('verification_status','verified').eq('is_public',true).neq('user_id', u.id)
      setQAList(qas || [])

      // Count existing groups by user
      const { count: gc } = await supabase.from('group_conversations').select('*', { count:'exact', head:true }).eq('created_by', u.id)
      setMyGroupCount(gc || 0)

      setLoading(false)

      // Auto-open if coming from profile
      if (openUserId) {
        const { data: conv } = await supabase.from('conversations').select('*')
          .or(`and(participant_1.eq.${u.id},participant_2.eq.${openUserId}),and(participant_1.eq.${openUserId},participant_2.eq.${u.id})`)
          .single()
        if (conv) {
          const other = await fetchProfile(openUserId)
          openChat({ type:'direct', id: conv.id, other, convData: conv })
        }
      }

      // Presence
      const presenceCh = supabase.channel('online-users')
        .on('presence', { event:'sync' }, () => {
          const state = presenceCh.presenceState()
          const ids = new Set(Object.values(state).flat().map((x: any) => x.user_id as string))
          setOnline(ids)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await presenceCh.track({ user_id: u.id })
        })
    })
  }, [])

  // ── Realtime for active chat ──
  useEffect(() => {
    if (!active || !user) return
    loadMsgs()
    markRead()

    const table  = active.type === 'direct' ? 'messages' : 'group_messages'
    const filter = active.type === 'direct' ? `conversation_id=eq.${active.id}` : `group_id=eq.${active.id}`

    const ch = supabase.channel(`chat:${active.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table, filter }, async (payload) => {
        const msg = payload.new as any
        if (active.type === 'group') {
          const sender = await fetchProfile(msg.sender_id)
          setMsgs(prev => [...prev, { ...msg, sender }])
        } else {
          setMsgs(prev => [...prev, msg])
        }
        scrollEnd()
        if (msg.sender_id !== user.id) markRead()
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [active?.id])

  useEffect(() => { scrollEnd() }, [msgs])
  const scrollEnd = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 60)

  // ── Load chats ──
  const loadChats = async (uid: string) => {
    const [{ data: convs }, { data: groups }] = await Promise.all([
      supabase.from('conversations').select('*').or(`participant_1.eq.${uid},participant_2.eq.${uid}`).order('last_message_at', { ascending:false }),
      supabase.from('group_conversations').select('*').contains('member_ids', [uid]).order('last_message_at', { ascending:false }),
    ])

    const directItems: ConvItem[] = await Promise.all((convs||[]).map(async c => {
      const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1
      const other = await fetchProfile(otherId)
      const { data: last } = await supabase.from('messages').select('content,file_type,created_at,sender_id').eq('conversation_id', c.id).order('created_at', { ascending:false }).limit(1).single()
      const { count: unread } = await supabase.from('messages').select('*', { count:'exact', head:true }).eq('conversation_id', c.id).eq('read', false).neq('sender_id', uid)
      return {
        id: c.id, type:'direct' as const, other,
        last_content: last ? (last.file_type === 'image' ? '📷 Image' : last.file_type === 'file' ? '📎 File' : last.content || '') : '',
        last_time: last?.created_at || c.created_at,
        unread: unread || 0,
      }
    }))

    const groupItems: GroupItem[] = await Promise.all((groups||[]).map(async g => {
      const { data: last } = await supabase.from('group_messages').select('content,created_at').eq('group_id', g.id).order('created_at', { ascending:false }).limit(1).single()
      return {
        id: g.id, type:'group' as const,
        name: g.name, description: g.description || '',
        member_count: (g.member_ids || []).length,
        last_content: last?.content || '',
        last_time: last?.created_at || g.created_at,
      }
    }))

    const all = [...directItems, ...groupItems].sort((a,b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())
    setChats(all)
  }

  const loadMsgs = async () => {
    if (!active) return
    if (active.type === 'direct') {
      const { data } = await supabase.from('messages').select('*').eq('conversation_id', active.id).order('created_at')
      setMsgs(data || [])
    } else {
      const { data } = await supabase.from('group_messages').select('*').eq('group_id', active.id).order('created_at')
      if (!data) return
      const withSenders = await Promise.all(data.map(async m => ({ ...m, sender: await fetchProfile(m.sender_id) })))
      setMsgs(withSenders)
    }
  }

  const markRead = async () => {
    if (!active || !user) return
    if (active.type === 'direct') {
      await supabase.from('messages').update({ read:true }).eq('conversation_id', active.id).neq('sender_id', user.id).eq('read', false)
    }
  }

  const loadPending = async (uid: string) => {
    const { data } = await supabase.from('connection_requests').select('*').eq('receiver_id', uid).eq('status','pending').order('created_at', { ascending:false })
    if (!data) return
    const enriched = await Promise.all(data.map(async r => ({ ...r, sender: await fetchProfile(r.sender_id) })))
    setPending(enriched)
  }

  const openChat = (item: any) => { setActive(item); setView('chat') }

  const handleRequest = async (id: string, action: 'accepted'|'declined', req: any) => {
    await supabase.from('connection_requests').update({ status: action }).eq('id', id)
    if (action === 'accepted') {
      const { data: conv } = await supabase.from('conversations').insert({ participant_1: user.id, participant_2: req.sender_id, connection_id: id }).select().single()
      await supabase.from('notifications').insert({ user_id: req.sender_id, type:'connection_accepted', title:'Connection accepted!', message:'Your connection request was accepted.', link:'/messages' })
      if (conv) {
        await loadChats(user.id)
        const other = await fetchProfile(req.sender_id)
        openChat({ type:'direct', id: conv.id, other, convData: conv })
      }
    }
    setPending(p => p.filter(r => r.id !== id))
  }

  const createGroup = async () => {
    if (myGroupCount >= 2) { alert('You can create a maximum of 2 group chats.'); return }
    if (!newGroup.name.trim() || newGroup.members.length === 0) return
    const memberIds = [user.id, ...newGroup.members]
    const { data: grp } = await supabase.from('group_conversations').insert({
      name: newGroup.name.trim(), description: newGroup.description.trim(), member_ids: memberIds, created_by: user.id,
    }).select().single()
    if (grp) {
      setMyGroupCount(c => c+1)
      await loadChats(user.id)
      openChat({ type:'group', id: grp.id, name: grp.name, description: grp.description, member_ids: grp.member_ids, created_by: grp.created_by })
    }
    setNewGroup({ name:'', description:'', members:[] })
  }

  const sendMsg = async () => {
    if (!text.trim() || !active || sending) return
    setSending(true)
    if (active.type === 'direct') {
      await supabase.from('messages').insert({ conversation_id: active.id, sender_id: user.id, content: text.trim(), read: false })
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    } else {
      await supabase.from('group_messages').insert({ group_id: active.id, sender_id: user.id, content: text.trim() })
      await supabase.from('group_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    }
    setText('')
    setSending(false)
    await loadChats(user.id)
  }

  const sendFile = async (file: File, type: 'image'|'file') => {
    // Security: validate MIME type
    const allowed = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES
    if (!allowed.includes(file.type)) {
      alert(`File type not allowed. ${type === 'image' ? 'Use JPG, PNG, GIF, or WebP.' : 'Use PDF, TXT, or DOC.'}`)
      return
    }
    const maxSize = type === 'image' ? 5*1024*1024 : 2*1024*1024
    if (file.size > maxSize) { alert(`Max size: ${type==='image'?'5MB':'2MB'}`); return }

    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error || !data) { alert(`Upload failed: ${error?.message}`); return }
    const { data: u } = supabase.storage.from('chat-files').getPublicUrl(data.path)

    if (active.type === 'direct') {
      await supabase.from('messages').insert({ conversation_id: active.id, sender_id: user.id, file_url: u.publicUrl, file_type: type, file_name: file.name, file_size: file.size, read: false })
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    } else {
      await supabase.from('group_messages').insert({ group_id: active.id, sender_id: user.id, file_url: u.publicUrl, file_type: type, file_name: file.name, file_size: file.size })
      await supabase.from('group_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    }
    await loadChats(user.id)
  }

  const filteredChats = chats.filter(c => {
    if (!search) return true
    const name = c.type === 'direct' ? c.other.display_name : c.name
    return name.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin"/></div>

  return (
    <>
      <Navbar/>
      <div className="h-screen pt-14 flex bg-[#F5F4F1]">
        <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 py-4 gap-3">

          {/* ── Sidebar ── */}
          <div className={`w-72 flex-shrink-0 flex flex-col bg-white rounded-xl border border-[#E8E6E1] overflow-hidden ${view==='chat' ? 'hidden md:flex' : 'flex'}`}>
            {/* Tabs */}
            <div className="flex border-b border-[#E8E6E1] px-1 pt-1">
              {[['list','Messages'],['requests','Requests'],['new-group','+ Group']].map(([v,l]) => (
                <button key={v} onClick={() => setView(v as any)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-t-lg transition-colors relative ${view===v ? 'text-[#111] border-b-2 border-[#111]' : 'text-[#111]/40 hover:text-[#111]/70'}`}>
                  {l}
                  {v==='requests' && pending.length>0 && <span className="absolute top-1 right-1 bg-[#C8473A] text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{pending.length}</span>}
                </button>
              ))}
            </div>

            {/* Search */}
            {view==='list' && (
              <div className="p-2.5 border-b border-[#E8E6E1]">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#111]/30"/>
                  <input className="w-full bg-[#F5F4F1] rounded-lg pl-7 pr-3 py-1.5 text-xs placeholder:text-[#111]/30 focus:outline-none border border-transparent focus:border-[#111]/15" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
              </div>
            )}

            {/* Chat list */}
            {view==='list' && (
              <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 && <div className="p-6 text-center text-[#111]/35 text-xs">No conversations yet</div>}
                {filteredChats.map(chat => {
                  const name  = chat.type==='direct' ? chat.other.display_name : chat.name
                  const photo = chat.type==='direct' ? chat.other.photo_url : null
                  const sub   = chat.type==='direct' ? chat.other.sub : `${chat.member_count} members`
                  const unread = chat.type==='direct' ? chat.unread : 0
                  const isActive = active?.id === chat.id

                  return (
                    <button key={chat.id} onClick={() => {
                      if (chat.type==='direct') openChat({ type:'direct', id:chat.id, other:chat.other })
                      else openChat({ type:'group', id:chat.id, name:(chat as GroupItem).name })
                    }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#E8E6E1]/60 hover:bg-[#F5F4F1] transition-colors text-left ${isActive ? 'bg-[#F5F4F1]' : ''}`}>
                      {chat.type==='group' ? (
                        <div className="w-9 h-9 rounded-lg bg-[#111] flex items-center justify-center flex-shrink-0"><Users size={14} className="text-white"/></div>
                      ) : (
                        <Avatar name={name} photo={photo} size={9} online={online.has(chat.other.user_id)}/>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={`text-sm truncate ${unread>0 ? 'font-semibold' : 'font-medium text-[#111]/75'}`}>{name}</p>
                          <span className="text-[10px] text-[#111]/30 flex-shrink-0 ml-2">{fmtTime(chat.last_time)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#111]/40 truncate">{chat.last_content || sub}</p>
                          {unread>0 && <span className="bg-[#C8473A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">{unread}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Requests */}
            {view==='requests' && (
              <div className="flex-1 overflow-y-auto">
                {pending.length===0 ? <div className="p-6 text-center text-[#111]/35 text-xs">No pending requests</div> : pending.map(r => (
                  <div key={r.id} className="p-3 border-b border-[#E8E6E1]/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar name={r.sender.display_name} photo={r.sender.photo_url} size={8}/>
                      <div>
                        <p className="text-sm font-semibold">{r.sender.display_name}</p>
                        <p className="text-xs text-[#111]/40">{r.sender.sub}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#111]/60 bg-[#F5F4F1] rounded-lg p-2.5 mb-2.5 leading-relaxed">"{r.message}"</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(r.id,'accepted',r)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#111] text-white hover:bg-[#222] transition-colors">Accept</button>
                      <button onClick={() => handleRequest(r.id,'declined',r)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[#F5F4F1] border border-[#E8E6E1] hover:bg-[#E8E6E1] transition-colors">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Group */}
            {view==='new-group' && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-xs text-[#111]/40 mb-3">Maximum 2 group chats per account ({myGroupCount}/2 used)</p>
                <div className="space-y-3">
                  <div><label className="label">Group name *</label><input className="input" value={newGroup.name} onChange={e => setNewGroup({...newGroup,name:e.target.value})} placeholder="e.g. QA Ukraine"/></div>
                  <div><label className="label">Description</label><input className="input" value={newGroup.description} onChange={e => setNewGroup({...newGroup,description:e.target.value})} placeholder="Optional"/></div>
                  <div>
                    <label className="label">Add QA specialists</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {qaList.map(qa => (
                        <label key={qa.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F4F1] cursor-pointer">
                          <input type="checkbox" checked={newGroup.members.includes(qa.user_id)}
                            onChange={e => setNewGroup(p => ({ ...p, members: e.target.checked ? [...p.members,qa.user_id] : p.members.filter(id=>id!==qa.user_id) }))}
                            className="rounded"/>
                          <div className="w-7 h-7 rounded-md bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span className="text-[10px] font-bold text-[#111]/30">{qa.full_name?.[0]}</span>}
                          </div>
                          <p className="text-sm font-medium">{qa.full_name}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={createGroup} disabled={!newGroup.name.trim()||newGroup.members.length===0||myGroupCount>=2} className="btn-primary w-full justify-center disabled:opacity-50">Create group</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Chat area ── */}
          <div className={`flex-1 flex flex-col bg-white rounded-xl border border-[#E8E6E1] overflow-hidden ${view!=='chat'&&!active ? 'hidden md:flex' : 'flex'}`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#F5F4F1] rounded-xl flex items-center justify-center mx-auto mb-3"><Send size={20} className="text-[#111]/20"/></div>
                  <p className="text-sm text-[#111]/35 font-medium">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E6E1] flex-shrink-0">
                  <button className="md:hidden p-1 text-[#111]/40 hover:text-[#111]" onClick={() => setView('list')}><ArrowLeft size={17}/></button>
                  {active.type==='group' ? (
                    <div className="w-9 h-9 rounded-lg bg-[#111] flex items-center justify-center flex-shrink-0"><Users size={14} className="text-white"/></div>
                  ) : (
                    <Avatar name={active.other?.display_name||''} photo={active.other?.photo_url||null} size={9} online={online.has(active.other?.user_id)}/>
                  )}
                  <div className="flex-1 min-w-0">
                    {active.type==='group' ? (
                      <p className="font-semibold text-sm">{active.name}</p>
                    ) : (
                      <Link href={active.other?.role==='company' ? `/companies/${active.other?.user_id}` : `/specialists/${active.other?.user_id}`}
                        className="font-semibold text-sm hover:text-[#C8473A] transition-colors">
                        {active.other?.display_name}
                      </Link>
                    )}
                    <p className="text-xs text-[#111]/40">
                      {active.type==='group' ? active.description || `${active.member_ids?.length||'?'} members` : online.has(active.other?.user_id) ? '● Online' : active.other?.sub}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                  {msgs.map((m, i) => {
                    const isMe   = m.sender_id === user?.id
                    const prev   = msgs[i-1]
                    const showDate = i===0 || fmtDate(prev?.created_at) !== fmtDate(m.created_at)
                    const grouped  = !showDate && prev?.sender_id === m.sender_id
                    const senderName = active.type==='group' ? (m.sender?.display_name || m.sender?.full_name || 'Unknown') : ''

                    return (
                      <div key={m.id || i}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-[#E8E6E1]"/>
                            <span className="text-[10px] font-medium text-[#111]/35">{fmtDate(m.created_at)}</span>
                            <div className="flex-1 h-px bg-[#E8E6E1]"/>
                          </div>
                        )}
                        <div className={`flex ${isMe?'justify-end':'justify-start'} ${grouped?'mt-0.5':'mt-3'}`}>
                          {/* Group sender avatar */}
                          {!isMe && active.type==='group' && !grouped && (
                            <div className="w-7 h-7 rounded-md bg-[#E8E6E1] overflow-hidden flex-shrink-0 mr-2 mt-auto mb-1 flex items-center justify-center">
                              {m.sender?.photo_url ? <img src={m.sender.photo_url} className="w-full h-full object-cover" alt=""/> : <span className="text-[9px] font-bold text-[#111]/30">{senderName[0]}</span>}
                            </div>
                          )}
                          {!isMe && active.type==='group' && grouped && <div className="w-7 mr-2 flex-shrink-0"/>}

                          <div className={`max-w-[58%] min-w-0 flex flex-col ${isMe?'items-end':'items-start'}`}>
                            {!isMe && active.type==='group' && !grouped && (
                              <p className="text-[10px] text-[#111]/40 font-medium mb-0.5 px-1">{senderName}</p>
                            )}
                            <div className={`rounded-2xl px-3.5 py-2.5 max-w-full ${isMe ? 'bg-[#111] text-white rounded-br-sm' : 'bg-[#F5F4F1] text-[#111] rounded-bl-sm'}`}>
                              {m.file_type==='image' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={m.file_url} className="rounded-xl max-w-[220px] max-h-[220px] object-cover cursor-zoom-in hover:opacity-90 transition-opacity" alt=""/>
                                </a>
                              )}
                              {m.file_type==='file' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm hover:underline ${isMe?'text-white/80':'text-[#111]/70'}`}>
                                  <Paperclip size={13}/>
                                  <span className="truncate max-w-[140px]">{m.file_name||'File'}</span>
                                  {m.file_size && <span className="text-xs opacity-50">{(m.file_size/1024).toFixed(0)}KB</span>}
                                </a>
                              )}
                              {m.content && <p className="text-sm leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>}
                            </div>
                            <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMe?'flex-row-reverse':''}`}>
                              <span className="text-[10px] text-[#111]/25">{new Date(m.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
                              {isMe && active.type==='direct' && (m.read ? <CheckCheck size={11} className="text-blue-500"/> : <Check size={11} className="text-[#111]/25"/>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef}/>
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-[#E8E6E1] flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <button onClick={()=>imgRef.current?.click()} title="Image (JPG, PNG, GIF, WebP — max 5MB)" className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E8E6E1] flex items-center justify-center text-[#111]/40 hover:text-[#111] hover:border-[#111]/20 transition-colors flex-shrink-0">
                      <ImageIcon size={14}/>
                    </button>
                    <button onClick={()=>fileRef.current?.click()} title="File (PDF, TXT, DOC — max 2MB)" className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E8E6E1] flex items-center justify-center text-[#111]/40 hover:text-[#111] hover:border-[#111]/20 transition-colors flex-shrink-0">
                      <Paperclip size={14}/>
                    </button>
                    <textarea className="flex-1 input resize-none py-2 max-h-28 min-h-[36px] text-sm" rows={1} value={text}
                      onChange={e=>setText(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg() }}}
                      placeholder="Message… (Enter to send)" maxLength={500}/>
                    <button onClick={sendMsg} disabled={!text.trim()||sending} className="w-8 h-8 rounded-lg bg-[#111] text-white flex items-center justify-center hover:bg-[#222] transition-colors disabled:opacity-35 flex-shrink-0">
                      <Send size={14}/>
                    </button>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <p className="text-[10px] text-[#111]/25">Images: JPG/PNG/GIF/WebP ≤5MB · Files: PDF/TXT/DOC ≤2MB</p>
                    {text.length>400 && <p className={`text-[10px] ${text.length>=500?'text-red-500':'text-[#111]/35'}`}>{text.length}/500</p>}
                  </div>
                </div>

                <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) sendFile(f,'image'); e.target.value='' }}/>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) sendFile(f,'file'); e.target.value='' }}/>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function MessagesPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin"/></div>}><MessagesInner/></Suspense>
}
