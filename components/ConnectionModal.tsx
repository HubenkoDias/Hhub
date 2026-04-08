'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Send } from 'lucide-react'

interface Props { target: any; targetType: 'qa'|'company'; onClose: () => void }

export default function ConnectionModal({ target, targetType, onClose }: Props) {
  const [msg,  setMsg]  = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err,  setErr]  = useState('')

  const name = targetType === 'qa' ? target.full_name : target.company_name

  const send = async () => {
    if (!msg.trim()) { setErr('Please write a message'); return }
    setBusy(true); setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErr('Please log in'); setBusy(false); return }
    const { error } = await supabase.from('connection_requests').insert({
      sender_id: user.id, receiver_id: target.user_id, message: msg.trim(),
    })
    if (error) {
      setErr(error.code === '23505' ? 'You already sent a request to this person.' : error.message)
      setBusy(false); return
    }
    // Create notification for receiver
    await supabase.from('notifications').insert({
      user_id: target.user_id,
      type: 'connection_request',
      title: 'New connection request',
      message: `Someone wants to connect with you`,
      link: '/messages',
    })
    setSent(true); setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-up">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">Connect</h2>
            <p className="text-[#0F0F0F]/50 text-sm mt-1">Send a request to {name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#EAE7E0] transition-colors"><X size={18}/></button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={24} className="text-emerald-600"/>
            </div>
            <h3 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">Request sent!</h3>
            <p className="text-[#0F0F0F]/50 text-sm mt-2">{name} will be notified and can accept or decline.</p>
            <button onClick={onClose} className="btn-primary mt-6">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 bg-[#EAE7E0] rounded-2xl p-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#D8D4CB] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {(targetType==='qa' ? target.photo_url : target.logo_url)
                  ? <img src={targetType==='qa' ? target.photo_url : target.logo_url} className="w-full h-full object-cover" alt={name}/>
                  : <span style={{ fontFamily:'var(--font-display)' }} className="font-bold text-[#0F0F0F]/30">{name?.[0]}</span>
                }
              </div>
              <div>
                <p className="font-semibold text-sm">{name}</p>
                <p className="text-xs text-[#0F0F0F]/50">{targetType==='qa' ? target.title : target.industry}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Your message <span className="text-red-500">*</span></label>
              <textarea className="input resize-none h-28" value={msg} onChange={e => setMsg(e.target.value)}
                placeholder={`Hi ${name?.split(' ')[0]}, I'd like to connect because...`} maxLength={500}/>
              <p className="text-xs text-[#0F0F0F]/35 text-right mt-1">{msg.length}/500</p>
            </div>
            {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">{err}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={send} disabled={busy || !msg.trim()} className="btn-accent flex-1 disabled:opacity-50">
                <Send size={15}/>{busy ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
