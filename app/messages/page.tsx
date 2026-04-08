'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Send, Paperclip, ImageIcon, ArrowLeft, Search, Plus, X, Users, Check, CheckCheck } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  user_id: string
  display_name: string
  photo_url: string | null
  sub: string
  role: 'qa' | 'company' | 'admin'
}

// Fetch user profile - determines if QA or Company by checking both tables
async function fetchProfile(uid: string): Promise<Profile> {
  try {
    // First check profiles table for role
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', uid)
      .single()

    const role = prof?.role || 'qa'

    if (role === 'company') {
      const { data: co } = await supabase
        .from('company_profiles')
        .select('company_name, logo_url, industry')
        .eq('user_id', uid)
        .single()
      return {
        user_id: uid,
        display_name: co?.company_name || 'Company',
        photo_url: co?.logo_url || null,
        sub: co?.industry || 'Company',
        role: 'company',
      }
    }

    // QA or Admin
    const { data: qa } = await supabase
      .from('qa_profiles')
      .select('full_name, photo_url, title')
      .eq('user_id', uid)
      .single()
    return {
      user_id: uid,
      display_name: qa?.full_name || 'QA Specialist',
      photo_url: qa?.photo_url || null,
      sub: qa?.title || 'QA Specialist',
      role: role as any,
    }
  } catch {
    return { user_id: uid, display_name: 'User', photo_url: null, sub: '', role: 'qa' }
  }
}

function profileLink(p: Profile): string {
  return p.role === 'company' ? `/companies/${p.user_id}` : `/specialists/${p.user_id}`
}

function fmtShort(ts: string) {
  if (!ts) return ''
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(ts: string) {
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

const ALLOWED_IMG  = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_FILE = ['application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, photo, online = false, size = 9 }: { name: string; photo: string | null; online?: boolean; size?: number }) {
  const cls = `w-${size} h-${size}`
  return (
    <div className={`${cls} rounded-lg bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center relative`}>
      {photo
        ? <img src={photo} className="w-full h-full object-cover" alt={name} />
        : <span className="text-xs font-bold text-[#111]/40 uppercase">{name?.[0] || '?'}</span>}
      {online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
function MessagesInner() {
  const router     = useRouter()
  const params     = useSearchParams()
  const openUserId = params.get('userId')

  const [me,       setMe]       = useState<any>(null)
  const [myRole,   setMyRole]   = useState<string>('')
  const [convs,    setConvs]    = useState<any[]>([])
  const [groups,   setGroups]   = useState<any[]>([])
  const [active,   setActive]   = useState<{ type: 'direct' | 'group'; id: string; meta: any } | null>(null)
  const [msgs,     setMsgs]     = useState<any[]>([])
  const [pending,  setPending]  = useState<any[]>([])
  const [tab,      setTab]      = useState<'chats' | 'requests' | 'group'>('chats')
  const [mobileChat, setMobileChat] = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [text,     setText]     = useState('')
  const [search,   setSearch]   = useState('')
  const [online,   setOnline]   = useState<Set<string>>(new Set())
  const [qaList,   setQAList]   = useState<any[]>([])
  const [myGroupCount, setMyGroupCount] = useState(0)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: [] as string[] })
  const [lightbox, setLightbox] = useState<string | null>(null)

  const endRef  = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef  = useRef<HTMLInputElement>(null)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push('/auth/login'); return }
      const u = session.user
      setMe(u)

      const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', u.id).single()
      setMyRole(prof?.role || '')

      await Promise.all([loadConvs(u.id), loadGroups(u.id), loadPending(u.id)])

      // QA list for group creation
      const { data: qas } = await supabase.from('qa_profiles')
        .select('user_id, full_name, photo_url')
        .eq('verification_status', 'verified')
        .eq('is_public', true)
        .neq('user_id', u.id)
      setQAList(qas || [])

      // My group count
      const { count } = await supabase.from('group_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', u.id)
      setMyGroupCount(count || 0)

      setLoading(false)

      // Presence channel
      const ch = supabase.channel('presence:global')
        .on('presence', { event: 'sync' }, () => {
          const ids = new Set(
            Object.values(ch.presenceState()).flat().map((x: any) => x.user_id as string)
          )
          setOnline(ids)
        })
        .subscribe(async (s) => { if (s === 'SUBSCRIBED') await ch.track({ user_id: u.id }) })

      // Auto-open from profile page
      if (openUserId) {
        const { data: conv } = await supabase.from('conversations')
          .select('*')
          .or(`and(participant_1.eq.${u.id},participant_2.eq.${openUserId}),and(participant_1.eq.${openUserId},participant_2.eq.${u.id})`)
          .single()
        if (conv) {
          const meta = await fetchProfile(openUserId)
          openDirect(conv.id, meta)
        }
      }
    })
  }, [])

  // ── Realtime for active chat ───────────────────────────────────────────────
  useEffect(() => {
    if (!active || !me) return
    loadMsgs()
    markRead()

    const table  = active.type === 'direct' ? 'messages' : 'group_messages'
    const filter = active.type === 'direct'
      ? `conversation_id=eq.${active.id}`
      : `group_id=eq.${active.id}`

    const ch = supabase.channel(`chat:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, async (payload) => {
        const msg = payload.new as any
        if (active.type === 'group') {
          const sender = await fetchProfile(msg.sender_id)
          setMsgs(prev => [...prev, { ...msg, sender }])
        } else {
          setMsgs(prev => [...prev, msg])
        }
        scrollEnd()
        if (msg.sender_id !== me.id) markRead()
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [active?.id])

  useEffect(() => { scrollEnd() }, [msgs.length])

  const scrollEnd = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadConvs = async (uid: string) => {
    const { data } = await supabase.from('conversations').select('*')
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order('last_message_at', { ascending: false })
    if (!data) return

    const enriched = await Promise.all(data.map(async c => {
      const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1
      const other = await fetchProfile(otherId)
      const { data: last } = await supabase.from('messages')
        .select('content, file_type, created_at, sender_id, read')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      const { count: unread } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('read', false)
        .neq('sender_id', uid)
      return { ...c, other, last, unread: unread || 0 }
    }))
    setConvs(enriched)
  }

  const loadGroups = async (uid: string) => {
    const { data } = await supabase.from('group_conversations').select('*')
      .contains('member_ids', [uid])
      .order('last_message_at', { ascending: false })
    if (!data) { setGroups([]); return }

    const enriched = await Promise.all(data.map(async g => {
      const memberIds: string[] = Array.isArray(g.member_ids) ? g.member_ids : []
      const { data: last } = await supabase.from('group_messages')
        .select('content, created_at')
        .eq('group_id', g.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return { ...g, memberIds, memberCount: memberIds.length, last }
    }))
    setGroups(enriched)
  }

  const loadMsgs = async () => {
    if (!active) return
    if (active.type === 'direct') {
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('conversation_id', active.id)
        .order('created_at')
      setMsgs(data || [])
    } else {
      const { data } = await supabase.from('group_messages')
        .select('*')
        .eq('group_id', active.id)
        .order('created_at')
      if (!data) return
      const withSenders = await Promise.all(
        data.map(async m => ({ ...m, sender: await fetchProfile(m.sender_id) }))
      )
      setMsgs(withSenders)
    }
  }

  const loadPending = async (uid: string) => {
    const { data } = await supabase.from('connection_requests')
      .select('*')
      .eq('receiver_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (!data) return
    const enriched = await Promise.all(data.map(async r => ({ ...r, sender: await fetchProfile(r.sender_id) })))
    setPending(enriched)
  }

  const markRead = async () => {
    if (!active || !me || active.type !== 'direct') return
    await supabase.from('messages')
      .update({ read: true })
      .eq('conversation_id', active.id)
      .neq('sender_id', me.id)
      .eq('read', false)
  }

  // ── Open chat ─────────────────────────────────────────────────────────────
  const openDirect = (convId: string, other: Profile) => {
    setActive({ type: 'direct', id: convId, meta: { other } })
    setMobileChat(true)
  }

  const openGroup = (group: any) => {
    setActive({ type: 'group', id: group.id, meta: group })
    setMobileChat(true)
  }

  // ── Accept/decline request ────────────────────────────────────────────────
  const handleRequest = async (id: string, action: 'accepted' | 'declined', req: any) => {
    await supabase.from('connection_requests').update({ status: action }).eq('id', id)
    if (action === 'accepted') {
      const { data: conv } = await supabase.from('conversations')
        .insert({ participant_1: me.id, participant_2: req.sender_id, connection_id: id })
        .select().single()
      await supabase.from('notifications').insert({
        user_id: req.sender_id, type: 'connection_accepted',
        title: 'Connection accepted!', message: 'Your request was accepted.', link: '/messages',
      })
      if (conv) {
        await loadConvs(me.id)
        openDirect(conv.id, req.sender)
      }
    }
    setPending(p => p.filter(r => r.id !== id))
  }

  // ── Create group ──────────────────────────────────────────────────────────
  const createGroup = async () => {
    if (myGroupCount >= 2) { alert('Maximum 2 group chats per account.'); return }
    if (!newGroup.name.trim() || newGroup.members.length === 0) return
    const memberIds = [me.id, ...newGroup.members]
    const { data: g } = await supabase.from('group_conversations')
      .insert({ name: newGroup.name.trim(), description: newGroup.description.trim(), member_ids: memberIds, created_by: me.id })
      .select().single()
    if (g) {
      setMyGroupCount(c => c + 1)
      await loadGroups(me.id)
      openGroup({ ...g, memberIds, memberCount: memberIds.length })
    }
    setNewGroup({ name: '', description: '', members: [] })
    setTab('chats')
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMsg = async () => {
    if (!text.trim() || !active || sending) return
    setSending(true)
    if (active.type === 'direct') {
      await supabase.from('messages').insert({
        conversation_id: active.id, sender_id: me.id, content: text.trim(), read: false,
      })
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
      await loadConvs(me.id)
    } else {
      await supabase.from('group_messages').insert({
        group_id: active.id, sender_id: me.id, content: text.trim(),
      })
      await supabase.from('group_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    }
    setText('')
    setSending(false)
  }

  // ── Send file ─────────────────────────────────────────────────────────────
  const sendFile = async (file: File, type: 'image' | 'file') => {
    const allowed = type === 'image' ? ALLOWED_IMG : ALLOWED_FILE
    if (!allowed.includes(file.type)) {
      alert(type === 'image' ? 'Use JPG, PNG, GIF or WebP.' : 'Use PDF, TXT or DOC.')
      return
    }
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > maxSize) { alert(`Max ${type === 'image' ? '5' : '2'}MB`); return }

    const path = `${me.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error || !data) { alert('Upload failed: ' + error?.message); return }
    const { data: u } = supabase.storage.from('chat-files').getPublicUrl(data.path)

    const payload = {
      sender_id: me.id, file_url: u.publicUrl, file_type: type,
      file_name: file.name, file_size: file.size,
    }
    if (active?.type === 'direct') {
      await supabase.from('messages').insert({ ...payload, conversation_id: active.id, read: false })
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
      await loadConvs(me.id)
    } else if (active?.type === 'group') {
      await supabase.from('group_messages').insert({ ...payload, group_id: active.id })
      await supabase.from('group_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    }
  }

  // ── Filter chats ──────────────────────────────────────────────────────────
  const filteredConvs = convs.filter(c =>
    !search || c.other?.display_name?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredGroups = groups.filter(g =>
    !search || g.name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin" />
    </div>
  )

  const activeMeta = active?.meta

  return (
    <>
      <Navbar />
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-5 text-white/60 hover:text-white text-2xl font-light leading-none">✕</button>
          <img src={lightbox} className="max-w-full max-h-[90vh] rounded-xl object-contain" alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <div className="h-screen pt-14 flex bg-[#F5F4F1]">
        <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 py-4 gap-3">

          {/* ── Sidebar — always visible on desktop ── */}
          <div className={`w-72 flex-shrink-0 flex flex-col bg-white rounded-xl border border-[#E8E6E1] overflow-hidden
            ${mobileChat ? 'hidden md:flex' : 'flex'} md:flex`}>

            {/* Tabs */}
            <div className="flex border-b border-[#E8E6E1]">
              {[['chats', 'Chats'], ['requests', `Requests${pending.length > 0 ? ` (${pending.length})` : ''}`], ['group', '+ Group']].map(([v, l]) => (
                <button key={v} onClick={() => setTab(v as any)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${tab === v ? 'text-[#111] border-[#111]' : 'text-[#111]/35 border-transparent hover:text-[#111]/60'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Search */}
            {tab === 'chats' && (
              <div className="p-2.5 border-b border-[#E8E6E1]">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#111]/30" />
                  <input className="w-full bg-[#F5F4F1] rounded-lg pl-7 pr-3 py-1.5 text-xs placeholder:text-[#111]/30 focus:outline-none"
                    placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            )}

            {/* Chat list */}
            {tab === 'chats' && (
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.length === 0 && filteredGroups.length === 0 && (
                  <div className="p-6 text-center text-[#111]/30 text-xs">No conversations yet</div>
                )}

                {/* Direct messages */}
                {filteredConvs.map(c => {
                  const isActive = active?.type === 'direct' && active.id === c.id
                  return (
                    <button key={c.id} onClick={() => openDirect(c.id, c.other)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F0EDE8] text-left transition-colors ${isActive ? 'bg-[#F0EDE8]' : 'hover:bg-[#F8F7F5]'}`}>
                      <Avatar name={c.other.display_name} photo={c.other.photo_url} online={online.has(c.other.user_id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className={`text-sm truncate ${c.unread > 0 ? 'font-semibold text-[#111]' : 'font-medium text-[#111]/75'}`}>
                            {c.other.display_name}
                          </p>
                          <span className="text-[10px] text-[#111]/30 flex-shrink-0 ml-2">{fmtShort(c.last?.created_at || c.created_at)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${c.unread > 0 ? 'text-[#111]/65 font-medium' : 'text-[#111]/40'}`}>
                            {c.last?.sender_id === me?.id ? 'You: ' : ''}
                            {c.last?.file_type === 'image' ? '📷 Image' : c.last?.file_type === 'file' ? '📎 File' : c.last?.content || ''}
                          </p>
                          {c.unread > 0 && <span className="bg-[#C8473A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">{c.unread}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {/* Group chats */}
                {filteredGroups.length > 0 && (
                  <div className="pt-1">
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-[#111]/30 uppercase tracking-widest">Group chats</p>
                    {filteredGroups.map(g => {
                      const isActive = active?.type === 'group' && active.id === g.id
                      return (
                        <button key={g.id} onClick={() => openGroup(g)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F0EDE8] text-left transition-colors ${isActive ? 'bg-[#F0EDE8]' : 'hover:bg-[#F8F7F5]'}`}>
                          <div className="w-9 h-9 rounded-lg bg-[#111] flex items-center justify-center flex-shrink-0">
                            <Users size={14} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#111]/80 truncate">{g.name}</p>
                            <p className="text-xs text-[#111]/35">{g.memberCount} members</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Requests */}
            {tab === 'requests' && (
              <div className="flex-1 overflow-y-auto">
                {pending.length === 0
                  ? <div className="p-6 text-center text-[#111]/30 text-xs">No pending requests</div>
                  : pending.map(r => (
                    <div key={r.id} className="p-3 border-b border-[#F0EDE8]">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar name={r.sender.display_name} photo={r.sender.photo_url} />
                        <div>
                          <p className="text-sm font-semibold">{r.sender.display_name}</p>
                          <p className="text-xs text-[#111]/40">{r.sender.sub}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#111]/60 bg-[#F5F4F1] rounded-lg p-2.5 mb-2.5 leading-relaxed">"{r.message}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRequest(r.id, 'accepted', r)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#111] text-white hover:bg-[#222] transition-colors">Accept</button>
                        <button onClick={() => handleRequest(r.id, 'declined', r)} className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[#F0EDE8] hover:bg-[#E8E6E1] transition-colors">Decline</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* New group */}
            {tab === 'group' && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-xs text-[#111]/40 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Max 2 group chats. You have {myGroupCount}/2.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Group name *</label>
                    <input className="input" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="e.g. QA Ukraine" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input className="input" value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="label">Members *</label>
                    <div className="space-y-1 max-h-44 overflow-y-auto border border-[#E8E6E1] rounded-lg p-1">
                      {qaList.length === 0 && <p className="text-xs text-[#111]/35 p-2">No QA specialists found</p>}
                      {qaList.map(qa => (
                        <label key={qa.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F5F4F1] cursor-pointer">
                          <input type="checkbox" checked={newGroup.members.includes(qa.user_id)}
                            onChange={e => setNewGroup(p => ({
                              ...p,
                              members: e.target.checked ? [...p.members, qa.user_id] : p.members.filter(id => id !== qa.user_id)
                            }))} className="rounded" />
                          <div className="w-7 h-7 rounded-md bg-[#E8E6E1] overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {qa.photo_url ? <img src={qa.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-bold text-[#111]/30">{qa.full_name?.[0]}</span>}
                          </div>
                          <p className="text-sm font-medium">{qa.full_name}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={createGroup} disabled={!newGroup.name.trim() || newGroup.members.length === 0 || myGroupCount >= 2}
                    className="btn-primary w-full justify-center disabled:opacity-40">
                    Create group chat
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Chat area ── */}
          <div className={`flex-1 flex flex-col bg-white rounded-xl border border-[#E8E6E1] overflow-hidden
            ${mobileChat ? 'flex' : 'hidden md:flex'}`}>

            {!active ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-[#F5F4F1] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Send size={18} className="text-[#111]/20" />
                  </div>
                  <p className="text-sm text-[#111]/35 font-medium">Select a conversation</p>
                  <p className="text-xs text-[#111]/25 mt-1">or start a new one from a profile</p>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E6E1] flex-shrink-0">
                  <button className="md:hidden p-1.5 rounded-lg hover:bg-[#F5F4F1] text-[#111]/40 transition-colors"
                    onClick={() => setMobileChat(false)}>
                    <ArrowLeft size={16} />
                  </button>

                  {active.type === 'group' ? (
                    <div className="w-9 h-9 rounded-lg bg-[#111] flex items-center justify-center flex-shrink-0">
                      <Users size={15} className="text-white" />
                    </div>
                  ) : (
                    <Avatar name={activeMeta.other.display_name} photo={activeMeta.other.photo_url}
                      online={online.has(activeMeta.other.user_id)} />
                  )}

                  <div className="flex-1 min-w-0">
                    {active.type === 'group' ? (
                      <p className="font-semibold text-sm">{activeMeta.name}</p>
                    ) : (
                      <Link href={profileLink(activeMeta.other)}
                        className="font-semibold text-sm hover:text-[#C8473A] transition-colors">
                        {activeMeta.other.display_name}
                      </Link>
                    )}
                    <p className="text-xs text-[#111]/40">
                      {active.type === 'group'
                        ? `${activeMeta.memberCount ?? activeMeta.memberIds?.length ?? '?'} members`
                        : online.has(activeMeta.other.user_id) ? '● Online now' : activeMeta.other.sub
                      }
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {msgs.map((m, i) => {
                    const isMe     = m.sender_id === me?.id
                    const prev     = msgs[i - 1]
                    const showDate = i === 0 || fmtDate(prev?.created_at) !== fmtDate(m.created_at)
                    const grouped  = !showDate && prev?.sender_id === m.sender_id
                    const senderName = active.type === 'group'
                      ? (m.sender?.display_name || m.sender?.full_name || 'Unknown')
                      : ''

                    return (
                      <div key={m.id || i}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-[#F0EDE8]" />
                            <span className="text-[10px] font-medium text-[#111]/30">{fmtDate(m.created_at)}</span>
                            <div className="flex-1 h-px bg-[#F0EDE8]" />
                          </div>
                        )}
                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-3'}`}>

                          {/* Group sender avatar */}
                          {!isMe && active.type === 'group' && !grouped && (
                            <div className="w-7 h-7 rounded-md bg-[#E8E6E1] overflow-hidden flex-shrink-0 mr-2 mt-auto mb-1 flex items-center justify-center">
                              {m.sender?.photo_url
                                ? <img src={m.sender.photo_url} className="w-full h-full object-cover" alt="" />
                                : <span className="text-[9px] font-bold text-[#111]/30">{senderName[0]}</span>}
                            </div>
                          )}
                          {!isMe && active.type === 'group' && grouped && <div className="w-7 mr-2 flex-shrink-0" />}

                          <div className={`max-w-[58%] min-w-0 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && active.type === 'group' && !grouped && (
                              <p className="text-[10px] text-[#111]/40 font-medium mb-0.5 px-1">{senderName}</p>
                            )}
                            <div className={`rounded-2xl px-3.5 py-2.5 max-w-full ${isMe ? 'bg-[#111] text-white rounded-br-sm' : 'bg-[#F5F4F1] text-[#111] rounded-bl-sm'}`}>
                              {m.file_type === 'image' && m.file_url && (
                                <button onClick={() => setLightbox(m.file_url)} className="block">
                                  <img src={m.file_url}
                                    className="rounded-xl max-w-[220px] max-h-[220px] object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                    alt="image" />
                                </button>
                              )}
                              {m.file_type === 'file' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                                  className={`flex items-center gap-2 text-sm hover:underline ${isMe ? 'text-white/80' : 'text-[#111]/70'}`}>
                                  <Paperclip size={13} />
                                  <span className="truncate max-w-[160px]">{m.file_name || 'File'}</span>
                                  {m.file_size && <span className="text-xs opacity-50">{(m.file_size / 1024).toFixed(0)}KB</span>}
                                </a>
                              )}
                              {m.content && <p className="text-sm leading-relaxed break-all whitespace-pre-wrap">{m.content}</p>}
                            </div>
                            <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-[#111]/25">
                                {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && active.type === 'direct' && (
                                m.read ? <CheckCheck size={11} className="text-blue-500" /> : <Check size={11} className="text-[#111]/25" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-[#E8E6E1] flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <button onClick={() => imgRef.current?.click()} title="Image (max 5MB)"
                      className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E8E6E1] flex items-center justify-center text-[#111]/40 hover:text-[#111] hover:border-[#111]/20 transition-colors flex-shrink-0">
                      <ImageIcon size={14} />
                    </button>
                    <button onClick={() => fileRef.current?.click()} title="File (max 2MB)"
                      className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E8E6E1] flex items-center justify-center text-[#111]/40 hover:text-[#111] hover:border-[#111]/20 transition-colors flex-shrink-0">
                      <Paperclip size={14} />
                    </button>
                    <textarea
                      className="flex-1 bg-[#F5F4F1] border border-[#E8E6E1] rounded-lg px-3 py-2 text-sm resize-none max-h-28 min-h-[36px] focus:outline-none focus:border-[#111]/30 transition-colors"
                      rows={1} value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                      placeholder="Message… (Enter to send)"
                      maxLength={500}
                    />
                    <button onClick={sendMsg} disabled={!text.trim() || sending}
                      className="w-8 h-8 rounded-lg bg-[#111] text-white flex items-center justify-center hover:bg-[#222] transition-colors disabled:opacity-35 flex-shrink-0">
                      <Send size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <p className="text-[10px] text-[#111]/25">Images ≤5MB · Files ≤2MB · PDF, TXT, DOC</p>
                    {text.length > 400 && <p className={`text-[10px] ${text.length >= 500 ? 'text-red-500' : 'text-[#111]/35'}`}>{text.length}/500</p>}
                  </div>
                </div>

                <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f, 'image'); e.target.value = '' }} />
                <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f, 'file'); e.target.value = '' }} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#111]/15 border-t-[#111] rounded-full animate-spin" />
      </div>
    }>
      <MessagesInner />
    </Suspense>
  )
}
