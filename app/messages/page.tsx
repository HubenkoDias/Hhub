'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Send, Paperclip, Image, ArrowLeft, X } from 'lucide-react'

export default function Messages() {
  const router = useRouter()
  const [user,     setUser]     = useState<any>(null)
  const [convs,    setConvs]    = useState<any[]>([])
  const [active,   setActive]   = useState<any>(null)
  const [msgs,     setMsgs]     = useState<any[]>([])
  const [text,     setText]     = useState('')
  const [pending,  setPending]  = useState<any[]>([])
  const [view,     setView]     = useState<'list'|'chat'|'requests'>('list')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const endRef    = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const imgRef    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      setUser(data.user)
      await loadConvs(data.user.id)
      await loadPending(data.user.id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!active || !user) return
    loadMsgs(active.id)
    const ch = supabase.channel(`conv:${active.id}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${active.id}` },
        (p) => { setMsgs(prev => [...prev, p.new]); scrollEnd() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active])

  useEffect(() => { scrollEnd() }, [msgs])
  const scrollEnd = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior:'smooth' }), 50)

  const getOtherProfile = async (uid: string) => {
    const { data: p } = await supabase.from('profiles').select('role').eq('user_id', uid).single()
    if (p?.role === 'qa') {
      const { data } = await supabase.from('qa_profiles').select('full_name,photo_url,title').eq('user_id', uid).single()
      return { ...data, role:'qa', user_id: uid, display_name: data?.full_name, sub: data?.title }
    }
    const { data } = await supabase.from('company_profiles').select('company_name,logo_url,industry').eq('user_id', uid).single()
    return { ...data, role:'company', user_id: uid, display_name: data?.company_name, photo_url: data?.logo_url, sub: data?.industry }
  }

  const loadConvs = async (uid: string) => {
    const { data } = await supabase.from('conversations').select('*').or(`participant_1.eq.${uid},participant_2.eq.${uid}`).order('last_message_at', { ascending: false })
    if (!data) return
    const enriched = await Promise.all(data.map(async c => {
      const otherId = c.participant_1 === uid ? c.participant_2 : c.participant_1
      const other = await getOtherProfile(otherId)
      const { data: last } = await supabase.from('messages').select('content,file_type,created_at').eq('conversation_id', c.id).order('created_at', { ascending:false }).limit(1).single()
      return { ...c, other, last }
    }))
    setConvs(enriched)
  }

  const loadMsgs = async (convId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at')
    setMsgs(data || [])
  }

  const loadPending = async (uid: string) => {
    const { data } = await supabase.from('connection_requests').select('*').eq('receiver_id', uid).eq('status','pending').order('created_at', { ascending:false })
    if (!data) return
    const enriched = await Promise.all(data.map(async r => {
      const sender = await getOtherProfile(r.sender_id)
      return { ...r, sender }
    }))
    setPending(enriched)
  }

  const handleRequest = async (id: string, action: 'accepted'|'declined', req: any) => {
    await supabase.from('connection_requests').update({ status: action }).eq('id', id)
    if (action === 'accepted') {
      await supabase.from('conversations').insert({ participant_1: user.id, participant_2: req.sender_id, connection_id: id })
      await loadConvs(user.id)
      setView('list')
    }
    setPending(p => p.filter(r => r.id !== id))
  }

  const sendText = async () => {
    if (!text.trim() || !active || sending) return
    setSending(true)
    await supabase.from('messages').insert({ conversation_id: active.id, sender_id: user.id, content: text.trim() })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
    setText(''); setSending(false)
  }

  const sendFile = async (file: File, type: 'image'|'file') => {
    const max = type === 'image' ? 5*1024*1024 : 2*1024*1024
    if (file.size > max) { alert(`Max ${type==='image'?'5MB':'2MB'} for ${type}s`); return }
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage.from('chat-files').upload(path, file)
    if (error || !data) { alert('Upload failed'); return }
    const { data: u } = supabase.storage.from('chat-files').getPublicUrl(data.path)
    await supabase.from('messages').insert({ conversation_id: active.id, sender_id: user.id, file_url: u.publicUrl, file_type: type, file_name: file.name, file_size: file.size })
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', active.id)
  }

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
  const fmtDate = (ts: string) => {
    const d = new Date(ts), t = new Date()
    if (d.toDateString()===t.toDateString()) return 'Today'
    const y = new Date(t); y.setDate(t.getDate()-1)
    if (d.toDateString()===y.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([],{month:'short',day:'numeric'})
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>

  return (
    <>
      <Navbar/>
      <div className="h-screen pt-16 flex flex-col bg-[#EAE7E0]">
        <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-6 py-6 gap-5">

          {/* Sidebar */}
          <div className={`w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-[#D8D4CB] overflow-hidden ${view==='chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex border-b border-[#D8D4CB]">
              <button onClick={() => setView('list')} className={`flex-1 py-3.5 text-sm font-medium transition-colors ${view!=='requests' ? 'text-[#0F0F0F] border-b-2 border-[#0F0F0F]' : 'text-[#0F0F0F]/40 hover:text-[#0F0F0F]/70'}`}>Messages</button>
              <button onClick={() => setView('requests')} className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${view==='requests' ? 'text-[#0F0F0F] border-b-2 border-[#0F0F0F]' : 'text-[#0F0F0F]/40 hover:text-[#0F0F0F]/70'}`}>
                Requests
                {pending.length > 0 && <span className="absolute top-2 right-6 bg-[#C8473A] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{pending.length}</span>}
              </button>
            </div>

            {view !== 'requests' && (
              <div className="flex-1 overflow-y-auto">
                {convs.length === 0
                  ? <div className="p-6 text-center text-[#0F0F0F]/40"><p className="font-mono text-sm">No conversations yet</p><p className="text-xs mt-1">Connect with someone to start chatting</p></div>
                  : convs.map(c => (
                    <button key={c.id} onClick={() => { setActive(c); setView('chat') }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#EAE7E0] transition-colors text-left border-b border-[#D8D4CB]/50 ${active?.id===c.id ? 'bg-[#EAE7E0]' : ''}`}>
                      <div className="w-11 h-11 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {c.other?.photo_url
                          ? <img src={c.other.photo_url} className="w-full h-full object-cover" alt=""/>
                          : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-sm">{(c.other?.display_name||'?')[0]}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium truncate">{c.other?.display_name}</p>
                          {c.last && <span className="text-xs text-[#0F0F0F]/40 flex-shrink-0 ml-2">{fmtDate(c.last.created_at)}</span>}
                        </div>
                        <p className="text-xs text-[#0F0F0F]/50 truncate mt-0.5">
                          {c.last?.file_type==='image' ? '📷 Image' : c.last?.file_type==='file' ? '📎 File' : c.last?.content || 'Start conversation'}
                        </p>
                      </div>
                    </button>
                  ))
                }
              </div>
            )}

            {view === 'requests' && (
              <div className="flex-1 overflow-y-auto">
                {pending.length === 0
                  ? <div className="p-6 text-center text-[#0F0F0F]/40"><p className="font-mono text-sm">No pending requests</p></div>
                  : pending.map(r => (
                    <div key={r.id} className="p-4 border-b border-[#D8D4CB]/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {r.sender?.photo_url
                            ? <img src={r.sender.photo_url} className="w-full h-full object-cover" alt=""/>
                            : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-xs">{(r.sender?.display_name||'?')[0]}</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.sender?.display_name}</p>
                          <p className="text-xs text-[#0F0F0F]/50">{r.sender?.sub}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#0F0F0F]/70 bg-[#EAE7E0] rounded-lg p-3 mb-3 leading-relaxed">"{r.message}"</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRequest(r.id,'accepted',r)} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#0F0F0F] text-[#EAE7E0] hover:bg-[#1A1A1A] transition-colors">Accept</button>
                        <button onClick={() => handleRequest(r.id,'declined',r)} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#D8D4CB] hover:bg-[#ccc8bf] transition-colors">Decline</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Chat */}
          <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-[#D8D4CB] overflow-hidden ${view!=='chat' && !active ? 'hidden md:flex' : 'flex'}`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-[#0F0F0F]/30">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#EAE7E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Send size={24} className="text-[#0F0F0F]/20"/>
                  </div>
                  <p className="font-mono text-sm">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#D8D4CB]">
                  <button className="md:hidden p-1 text-[#0F0F0F]/50 hover:text-[#0F0F0F]" onClick={() => setView('list')}><ArrowLeft size={18}/></button>
                  <div className="w-10 h-10 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {active.other?.photo_url
                      ? <img src={active.other.photo_url} className="w-full h-full object-cover" alt=""/>
                      : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30 text-xs">{(active.other?.display_name||'?')[0]}</span>
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm">{active.other?.display_name}</p>
                    <p className="text-xs text-[#0F0F0F]/50">{active.other?.sub}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                  {msgs.map((m, i) => {
                    const isMe = m.sender_id === user.id
                    const showDate = i===0 || fmtDate(msgs[i-1]?.created_at) !== fmtDate(m.created_at)
                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="text-xs font-mono text-[#0F0F0F]/30 bg-[#EAE7E0] px-3 py-1 rounded-full">{fmtDate(m.created_at)}</span>
                          </div>
                        )}
                        <div className={`flex ${isMe?'justify-end':'justify-start'}`}>
                          <div className={`max-w-[60%] min-w-0 flex flex-col gap-1 ${isMe?'items-end':'items-start'}`}>
                            <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#0F0F0F] text-white rounded-tr-sm' : 'bg-[#EAE7E0] text-[#0F0F0F] rounded-tl-sm'}`}>
                              {m.file_type==='image' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                                  <img src={m.file_url} className="rounded-xl max-w-[240px] max-h-[240px] object-cover mb-1" alt="img"/>
                                </a>
                              )}
                              {m.file_type==='file' && m.file_url && (
                                <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm hover:underline ${isMe?'text-white/80':'text-[#0F0F0F]/70'}`}>
                                  <Paperclip size={14}/>
                                  <span className="truncate max-w-[160px]">{m.file_name||'File'}</span>
                                  {m.file_size && <span className="text-xs opacity-60">{(m.file_size/1024).toFixed(0)}KB</span>}
                                </a>
                              )}
                              {m.content && <p className="text-sm leading-relaxed break-all whitespace-pre-wrap overflow-hidden">{m.content}</p>}
                            </div>
                            <span className="text-xs text-[#0F0F0F]/30 px-1">{fmtTime(m.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef}/>
                </div>

                <div className="px-5 py-4 border-t border-[#D8D4CB]">
                  <div className="flex items-end gap-3">
                    <div className="flex gap-1">
                      <button onClick={() => imgRef.current?.click()} title="Image (max 5MB)" className="w-9 h-9 rounded-xl bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F]"><Image size={16}/></button>
                      <button onClick={() => fileRef.current?.click()} title="File (max 2MB)" className="w-9 h-9 rounded-xl bg-[#EAE7E0] hover:bg-[#D8D4CB] transition-colors flex items-center justify-center text-[#0F0F0F]/50 hover:text-[#0F0F0F]"><Paperclip size={16}/></button>
                    </div>
                    <textarea
                      className="flex-1 input resize-none py-2.5 max-h-32 min-h-[44px]"
                      rows={1} value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendText() }}}
                      placeholder="Type a message… (Enter to send)" maxLength={500}
                    />
                    <button onClick={sendText} disabled={!text.trim()||sending} className="w-9 h-9 rounded-xl bg-[#0F0F0F] text-white flex items-center justify-center hover:bg-[#1A1A1A] transition-colors disabled:opacity-40 flex-shrink-0">
                      <Send size={16}/>
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2"><p className="text-xs text-[#0F0F0F]/30 font-mono">Images up to 5 MB · Files up to 2 MB</p>{text.length > 400 && <p className={`text-xs font-mono ${text.length >= 500 ? 'text-red-500' : 'text-[#0F0F0F]/40'}`}>{text.length}/500</p>}</div>
                </div>

                <input ref={imgRef}  type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'image');  e.target.value='' }}/>
                <input ref={fileRef} type="file"                   className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) sendFile(f,'file');   e.target.value='' }}/>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
