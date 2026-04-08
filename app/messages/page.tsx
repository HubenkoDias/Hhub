'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Send, Paperclip, Image, ArrowLeft, Search, Plus, X, Users, Check, CheckCheck, Circle } from 'lucide-react'
import { Suspense } from 'react'

function MessagesInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const openUserId  = searchParams.get('userId') // redirect from profile

  const [user,     setUser]     = useState<any>(null)
  const [role,     setRole]     = useState<string|null>(null)
  const [convs,    setConvs]    = useState<any[]>([])
  const [active,   setActive]   = useState<any>(null)
  const [msgs,     setMsgs]     = useState<any[]>([])
  const [text,     setText]     = useState('')
  const [pending,  setPending]  = useState<any[]>([])
  const [view,     setView]     = useState<'list'|'chat'|'requests'|'new-group'>('list')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [readMap,  setReadMap]  = useState<Record<string,boolean>>({})
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [qaList,   setQAList]   = useState<any[]>([])
  const [myGroups, setMyGroups] = useState<any[]>([])

  const endRef    = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const imgRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
      if (p) setRole(p.role)
      await loadConvs(data.user.id)
      await loadPending(data.user.id)
      // Load QA list for group creation
      const { data: qas } = await supabase.from('qa_profiles').select('user_id,full_name,photo_url').eq('verification_status','verified').eq('is_public',true).neq('user_id', data.user.id)
      setQAList(qas || [])
      // Load my group chats
      const { data: grps } = await supabase.from('group_conversations').select('*').contains('member_ids', [data.user.id])
      setMyGroups(grps || [])
      setLoading(false)

      // Set up presence
      const channel = supabase.channel('presence').on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set(Object.values(state).flat().map((p: any) => p.user_id))
        setOnlineUsers(online)
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: data.user.id })
        }
      })

      // Auto-open conversation if coming from profile page
      if (openUserId) {
        // Find existing accepted connection
        const { data: conn } = await supabase.from('connection_requests').select('*')
          .or(`and(sender_id.eq.${data.user.id},receiver_id.eq.${openUserId}),and(sender_id.eq.${openUserId},receiver_id.eq.${data.user.id})`)
          .eq('status','accepted').single()
        if (conn) {
          const { data: conv } = await supabase.from('conversations')
            .select('*')
            .or(`and(participant_1.eq.${data.user.id},participant_2.eq.${openUserId}),and(participant_1.eq.${openUserId},participant_2.eq.${data.user.id})`)
            .single()
          if (conv) {
            // Will be set after convs load
            setTimeout(async () => {
              const other = await getOtherProfile(openUserId)
              setActive({ ...conv, other })
              setView('chat')
            }, 500)
          }
        }
      }
    })
  }, [])

  useEffect(() => {
    if (!active || !user) return
    loadMsgs(active.id)
    markRead(active.id)

    const ch = supabase.channel(`conv:${active.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${active.id}` },
        async (p) => {
          const msg = p.new as any
          // fetch sender profile for display
          const senderProfile = await getSenderProfile(msg.sender_id)
          setMsgs(prev => [...prev, { ...msg, senderProfile }])
          scrollEnd()
          if (msg.sender_id !== user.id) markRead(active.id)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active])

  useEffect(() => { scrollEnd() }, [msgs])
  const scrollEnd = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 50)

  const markRead = async (convId: string) => {
    await supabase.from('messages').update({ read: true }).eq('conversation_id', convId).neq('sender_id', user?.id).eq('read', false)
  }

  const getSenderProfile = async (userId: string) => {
    const { data: p } = await supabase.from('profiles').select('role').eq('user_id', userId).single()
    if (p?.role === 'qa' || p?.role === 'admin') {
      const { data } = await supabase.from('qa_profiles').select('full_name,photo_url').eq('user_id', userId).single()
      return { ...data, user_id: userId, role: p.role }
    }
    const { data } = await supabase.from('company_profiles').select('company_name,logo_url').eq('user_id', userId).single()
    return { full_name: data?.company_name, photo_url: data?.logo_url, user_id: userId, role: 'company' }
  }

  const getOtherProfile = async (uid: string) => {
    const { data: p } = await supabase.from('profiles').select('role').eq('user_id', uid).single()
    if (p?.role === 'qa' || p?.role === 'admin') {
      const { data } = await supabase.from('qa_profiles').select('full_name,photo_url,title').eq('user_id', uid).single()
      return { ...data, role: p.role, user_id: uid, display_name: data?.full_name, sub: data?.title }
    }
    const { data } = await supabase.from('company_profiles').select('company_name,logo_url,industry').eq('user_id', uid).single()
    return { ...data, role:'company', user_id: uid, display_name: data?.company_name, photo_url: data?.logo_url, sub: data?.industry }
  }

  const loadConvs = async (uid: string) => {
    const { data } = await supabase.from('conversations').select('*')
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order('last_message_at', { ascending: false })
    if (!data) return
    const enriched = await Promise.all(data.map(async c => {
      const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1
      const other = await getOtherProfile(otherId)
      const { data: last } = await supabase.from('messages').select('content,file_type,created_at,sender_id,read').eq('conversation_id', c.id).order('created_at', { ascending:false }).limit(1).single()
      const { count: unread } = await supabase.from('messages').select('*', { count:'exact', head:true }).eq('conversation_id', c.id).eq('read', false).neq('sender_id', uid)
      return { ...c, other, last, unread: unread || 0 }
    }))
    setConvs(enriched)
  }

  const loadMsgs = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at')
    if (!data) return
    const withProfiles = await Promise.all(data.map(async m => ({
      ...m,
      senderProfile: await getSenderProfile(m.sender_id)
    })))
    setMsgs(withProfiles)
  }

  const loadPending = async (uid: string) => {
    const { data } = await supabase.from('connection_requests').select('*').eq('receiver_id', uid).eq('status','pending').order('created_at', { ascending:false })
    if (!data) return
    const enriched = await Promise.all(data.map(async r => ({
      ...r,
      sender: await getOtherProfile(r.sender_id)
    })))
    setPending(enriched)
  }

  const handleRequest = async (id: string, action: 'accepted'|'declined', req: any) => {
    await supabase.from('connection_requests').update({ status: action }).eq('id', id)
    if (action === 'accepted') {
      const { data: conv } = await supabase.from('conversations').insert({
        participant_1: user.id, participant_2: req.sender_id, connection_id: id
      }).select().single()
      // Notify sender
      await supabase.from('notifications').insert({
        user_id: req.sender_id, type:'connection_accepted',
        title:'Connection accepted!', message:'Your connection request was accepted.',
        link:'/messages'
      })
      await loadConvs(user.id)
      if (conv) { const other = await getOtherProfile(req.sender_id); setActive({ ...conv, other }); setView('chat') }
    }
    setPending(p => p.filter(r => r.id !== id))
  }

  const createGroupChat = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return
    const { count: existing } = await supabase.from('group_conversations').select('*', { count:'exact', head:true }).contains('member_ids', [user.id]).eq('created_by', user.id)
    if ((existing || 0) >= 2) { alert('You can create a maximum of 2 group chats.'); return }
    const memberIds = [user.id, ...groupMembers]
    const { data: grp } = await supabase.from('group_conversations').insert({
      name: groupName.trim(), member_ids: memberIds, created_by: user.id
    }).select().single()
    if (grp) {
      setMyGroups(p => [...p, grp])
      setActive({ ...grp, isGroup: true })
      setView('chat')
    }
    setGroupName(''); setGroupMembers([]); setView('list')
  }

  const sendText = async () => {
    if (!text.trim() || !active || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: active.id, sender_id: user.id, content: text.trim(), read: false,
      is_group: active.isGroup || false,
    })
    await supabase.from(active.isGroup ? 'group_conversations' : 'conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    setText(''); setSending(false)
  }

  const sendFile = async (file: File, type: 'image'|'file') => {
    const max = type === 'image' ? 5*1024*1024 : 2*1024*1024
    if (file.size > max) { alert(`Max ${type==='image'?'5MB':'2MB'} for ${type}s`); return }
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file, { upsert: false })
    if (error || !data) { alert(`Upload failed: ${error?.message}`); return }
    const { data: u } = supabase.storage.from('chat-files').getPublicUrl(data.path)
    await supabase.from('messages').insert({
      conversation_id: active.id, sender_id: user.id,
      file_url: u.publicUrl, file_type: type, file_name: file.name, file_size: file.size, read: false,
      is_group: active.isGroup || false,
    })
    await supabase.from(active.isGroup ? 'group_conversations' : 'conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
  }

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
  const fmtDate = (ts: string) => {
    const d = new Date(ts), t = new Date()
    if (d.toDateString() === t.toDateString()) return 'Today'
    const y = new Date(t); y.setDate(t.getDate()-1)
    if (d.toDateString() === y.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
  }

  const filteredConvs = convs.filter(c =>
    !search || c.other?.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>

  const Avatar = ({ profile, size = 10 }: any) => (
    <div className={`w-${size} h-${size} rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center relative`}>
      {profile?.photo_url
        ? <img src={profile.photo_url} className="w-full h-full object-cover" alt=""/>
        : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-xs">{(profile?.display_name || profile?.full_name || '?')[0]}</span>
      }
      {onlineUsers.has(profile?.user_id) && (
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"/>
      )}
    </div>
  )

  return (
    <>
      <Navbar/>
      <div className="h-screen pt-16 flex flex-col bg-[#EAE7E0]">
        <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-6 py-6 gap-5">

          {/* Sidebar */}
          <div className={`w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-[#D8D4CB] overflow-hidden ${view==='chat' ? 'hidden md:flex' : 'flex'}`}>

            {/* Tabs */}
            <div className="flex border-b border-[#D8D4CB]">
              <button onClick={() => setView('list')} className={`flex-1 py-3 text-xs font-medium transition-colors ${view==='list' ? 'text-[#0F0F0F] border-b-2 border-[#0F0F0F]' : 'text-[#0F0F0F]/40 hover:text-[#0F0F0F]/70'}`}>Messages</button>
              <button onClick={() => setView('requests')} className={`flex-1 py-3 text-xs font-medium transition-colors relative ${view==='requests' ? 'text-[#0F0F0F] border-b-2 border-[#0F0F0F]' : 'text-[#0F0F0F]/40 hover:text-[#0F0F0F]/70'}`}>
                Requests
                {pending.length > 0 && <span className="absolute top-2 right-4 bg-[#C8473A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{pending.length}</span>}
              </button>
              {(role === 'qa' || role === 'admin') && (
                <button onClick={() => setView('new-group')} className={`flex-1 py-3 text-xs font-medium transition-colors ${view==='new-group' ? 'text-[#0F0F0F] border-b-2 border-[#0F0F0F]' : 'text-[#0F0F0F]/40 hover:text-[#0F0F0F]/70'}`}>
                  <Plus size={14} className="inline mr-1"/>Group
                </button>
              )}
            </div>

            {/* Search */}
            {view === 'list' && (
              <div className="p-3 border-b border-[#D8D4CB]">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F0F0F]/30"/>
                  <input className="w-full bg-[#EAE7E0] rounded-xl pl-8 pr-3 py-2 text-xs placeholder:text-[#0F0F0F]/35 focus:outline-none" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
              </div>
            )}

            {/* CONVERSATIONS */}
            {view === 'list' && (
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.length === 0 && (
                  <div className="p-6 text-center text-[#0F0F0F]/40 text-xs font-mono">No conversations yet</div>
                )}
                {filteredConvs.map(c => (
                  <button key={c.id} onClick={() => { setActive(c); setView('chat') }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EAE7E0] transition-colors text-left border-b border-[#D8D4CB]/40 ${active?.id===c.id ? 'bg-[#EAE7E0]' : ''}`}>
                    <div className="relative flex-shrink-0">
                      <Avatar profile={c.other} size={11}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate ${c.unread > 0 ? 'font-semibold text-[#0F0F0F]' : 'font-medium text-[#0F0F0F]/80'}`}>{c.other?.display_name}</p>
                        {c.last && <span className="text-[10px] text-[#0F0F0F]/35 flex-shrink-0 ml-2 font-mono">{fmtDate(c.last.created_at)}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-[#0F0F0F]/70 font-medium' : 'text-[#0F0F0F]/45'}`}>
                          {c.last?.sender_id === user?.id && <span className="text-[#0F0F0F]/30">You: </span>}
                          {c.last?.file_type==='image' ? '📷 Image' : c.last?.file_type==='file' ? '📎 File' : c.last?.content || 'Start conversation'}
                        </p>
                        {c.unread > 0 && <span className="bg-[#C8473A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                ))}
                {/* Group chats */}
                {myGroups.length > 0 && (
                  <div className="border-t border-[#D8D4CB]/40 pt-1">
                    <p className="text-[10px] font-mono text-[#0F0F0F]/30 uppercase tracking-widest px-4 py-2">Group chats</p>
                    {myGroups.map(g => (
                      <button key={g.id} onClick={() => { setActive({ ...g, isGroup: true }); setView('chat') }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EAE7E0] transition-colors text-left border-b border-[#D8D4CB]/40 ${active?.id===g.id ? 'bg-[#EAE7E0]' : ''}`}>
                        <div className="w-11 h-11 rounded-xl bg-[#0F0F0F] flex items-center justify-center flex-shrink-0">
                          <Users size={16} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{g.name}</p>
                          <p className="text-xs text-[#0F0F0F]/40">{g.member_ids?.length} members</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REQUESTS */}
            {view === 'requests' && (
              <div className="flex-1 overflow-y-auto">
                {pending.length === 0
                  ? <div className="p-6 text-center text-[#0F0F0F]/40 text-xs font-mono">No pending requests</div>
                  : pending.map(r => (
                    <div key={r.id} className="p-4 border-b border-[#D8D4CB]/40">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar profile={r.sender} size={10}/>
                        <div>
                          <p className="text-sm font-semibold">{r.sender?.display_name}</p>
                          <p className="text-xs text-[#0F0F0F]/45">{r.sender?.sub}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#0F0F0F]/65 bg-[#EAE7E0] rounded-xl p-3 mb-3 leading-relaxed">"{r.message}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRequest(r.id,'accepted',r)} className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#0F0F0F] text-white hover:bg-[#1A1A1A] transition-colors">Accept</button>
                        <button onClick={() => handleRequest(r.id,'declined',r)} className="flex-1 py-2 rounded-xl text-xs font-medium bg-[#D8D4CB] hover:bg-[#ccc8bf] transition-colors">Decline</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* NEW GROUP */}
            {view === 'new-group' && (
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-xs font-mono text-[#0F0F0F]/40 mb-4">Max 2 group chats per QA specialist</p>
                <div className="mb-4">
                  <label className="label">Group name</label>
                  <input className="input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. QA Ukraine Team"/>
                </div>
                <div className="mb-4">
                  <label className="label">Add QA specialists</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {qaList.map(qa => (
                      <label key={qa.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#EAE7E0] cursor-pointer">
                        <input type="checkbox" checked={groupMembers.includes(qa.user_id)} onChange={e => {
                          setGroupMembers(p => e.target.checked ? [...p, qa.user_id] : p.filter(id => id !== qa.user_id))
                        }} className="rounded"/>
                        <div className="w-8 h-8 rounded-lg bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt=""/> : <span className="text-xs font-bold text-[#0F0F0F]/30">{qa.full_name?.[0]}</span>}
                        </div>
                        <p className="text-sm font-medium">{qa.full_name}</p>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={createGroupChat} disabled={!groupName.trim() || groupMembers.length === 0} className="btn-accent w-full disabled:opacity-50">
                  Create group
                </button>
              </div>
            )}
          </div>

          {/* CHAT AREA */}
          <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-[#D8D4CB] overflow-hidden ${view!=='chat' && !active ? 'hidden md:flex' : 'flex'}`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-[#0F0F0F]/30">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#EAE7E0] rounded-2xl flex items-center justify-center mx-auto mb-4"><Send size={24} className="text-[#0F0F0F]/20"/></div>
                  <p className="font-mono text-sm">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#D8D4CB] flex-shrink-0">
                  <button className="md:hidden p-1 text-[#0F0F0F]/50 hover:text-[#0F0F0F]" onClick={() => setView('list')}><ArrowLeft size={18}/></button>
                  {active.isGroup ? (
                    <div className="w-10 h-10 rounded-xl bg-[#0F0F0F] flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-white"/>
                    </div>
                  ) : (
                    <div className="relative flex-shrink-0">
                      <Avatar profile={active.other} size={10}/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {active.isGroup ? (
                      <p className="font-semibold text-sm">{active.name}</p>
                    ) : (
                      <Link href={active.other?.role === 'qa' || active.other?.role === 'admin' ? `/specialists/${active.other?.user_id}` : `/companies/${active.other?.user_id}`}
                        className="font-semibold text-sm hover:text-[#C8473A] transition-colors">
                        {active.other?.display_name}
                      </Link>
                    )}
                    <p className="text-xs text-[#0F0F0F]/40">
                      {active.isGroup
                        ? `${active.member_ids?.length} members`
                        : onlineUsers.has(active.other?.user_id) ? '🟢 Online' : active.other?.sub
                      }
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                  {msgs.map((m, i) => {
                    const isMe = m.sender_id === user?.id
                    const showDate = i === 0 || fmtDate(msgs[i-1]?.created_at) !== fmtDate(m.created_at)
                    const showAvatar = !isMe && (active.isGroup) && (i === 0 || msgs[i-1]?.sender_id !== m.sender_id)
                    const isRead = m.read && isMe

                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="text-[10px] font-mono text-[#0F0F0F]/30 bg-[#EAE7E0] px-3 py-1 rounded-full">{fmtDate(m.created_at)}</span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${i > 0 && msgs[i-1]?.sender_id === m.sender_id ? 'mt-0.5' : 'mt-3'}`}>
                          {/* Avatar for group chats */}
                          {!isMe && active.isGroup && (
                            <div className="w-7 h-7 rounded-lg bg-[#D8D4CB] overflow-hidden flex-shrink-0 mr-2 mt-auto mb-1 flex items-center justify-center">
                              {m.senderProfile?.photo_url
                                ? <img src={m.senderProfile.photo_url} className="w-full h-full object-cover" alt=""/>
                                : <span className="text-[9px] font-bold text-[#0F0F0F]/30">{(m.senderProfile?.full_name || '?')[0]}</span>
                              }
                            </div>
                          )}
                          <div className={`max-w-[60%] min-w-0 flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Sender name in group */}
                            {!isMe && active.isGroup && (i === 0 || msgs[i-1]?.sender_id !== m.sender_id) && (
                              <p className="text-[10px] text-[#0F0F0F]/40 font-mono px-1">{m.senderProfile?.full_name || 'Unknown'}</p>
                            )}
                            <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#0F0F0F] text-white rounded-tr-sm' : 'bg-[#EAE7E0] text-[#0F0F0F] rounded-tl-sm'}`}>
                              {m.file_type === 'image' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={m.file_url} className="rounded-xl max-w-[240px] max-h-[240px] object-cover cursor-zoom-in" alt="img"/>
                                </a>
                              )}
                              {m.file_type === 'file' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm hover:underline ${isMe ? 'text-white/80' : 'text-[#0F0F0F]/70'}`}>
                                  <Paperclip size={14}/>
                                  <span className="truncate max-w-[160px]">{m.file_name || 'File'}</span>
                                  {m.file_size && <span className="text-xs opacity-60">{(m.file_size/1024).toFixed(0)}KB</span>}
                                </a>
                              )}
                              {m.content && <p className="text-sm leading-relaxed break-all whitespace-pre-wrap overflow-hidden">{m.content}</p>}
                            </div>
                            <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-[#0F0F0F]/30 font-mono">{fmtTime(m.created_at)}</span>
                              {isMe && (
                                isRead
                                  ? <CheckCheck size={12} className="text-blue-500"/>
                                  : <Check size={12} className="text-[#0F0F0F]/30"/>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef}/>
                </div>

                {/* Input */}
                <div className="px-5 py-4 border-t border-[#D8D4CB] flex-shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => imgRef.current?.click()} title="Image (max 5MB)" className="w-9 h-9 rounded-xl bg-[#EAE7E0] hover:bg-[#D8D4CB] flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F] transition-colors">
                        <Image size={16}/>
                      </button>
                      <button onClick={() => fileRef.current?.click()} title="File (max 2MB)" className="w-9 h-9 rounded-xl bg-[#EAE7E0] hover:bg-[#D8D4CB] flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F] transition-colors">
                        <Paperclip size={16}/>
                      </button>
                    </div>
                    <textarea
                      className="flex-1 input resize-none py-2.5 max-h-32 min-h-[44px]"
                      rows={1} value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendText() }}}
                      placeholder="Type a message… (Enter to send)"
                      maxLength={500}
                    />
                    <button onClick={sendText} disabled={!text.trim()||sending} className="w-9 h-9 rounded-xl bg-[#0F0F0F] text-white flex items-center justify-center hover:bg-[#1A1A1A] transition-colors disabled:opacity-40 flex-shrink-0">
                      <Send size={16}/>
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-[#0F0F0F]/30 font-mono">Images up to 5 MB · Files up to 2 MB</p>
                    {text.length > 400 && <p className={`text-[10px] font-mono ${text.length>=500?'text-red-500':'text-[#0F0F0F]/40'}`}>{text.length}/500</p>}
                  </div>
                </div>

                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'image'); e.target.value='' }}/>
                <input ref={fileRef} type="file" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'file'); e.target.value='' }}/>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function MessagesPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>}><MessagesInner/></Suspense>
}
