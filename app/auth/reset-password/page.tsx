'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const router = useRouter()
  const [pass,  setPass]  = useState('')
  const [pass2, setPass2] = useState('')
  const [show,  setShow]  = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')
  const [done,  setDone]  = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (pass !== pass2) { setErr('Passwords do not match'); return }
    if (pass.length < 8) { setErr('Password must be at least 8 characters'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) { setErr(error.message); setBusy(false); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {done ? (
          <div className="text-center">
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white mb-3">Password updated!</h1>
            <p className="text-white/45">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-white/45 mb-8">Choose a strong password for your account.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label text-white/45">New password</label>
                <div className="relative">
                  <input type={show?'text':'password'} required value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                    className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 pr-12"/>
                  <button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="label text-white/45">Confirm password</label>
                <input type={show?'text':'password'} required value={pass2} onChange={e => setPass2(e.target.value)} placeholder="••••••••"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"/>
              </div>
              {err && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{err}</div>}
              <button type="submit" disabled={busy} className="w-full bg-[#C8473A] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#D9584B] transition-all disabled:opacity-50">
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
