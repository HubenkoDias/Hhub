'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPassword() {
  const [email,  setEmail]  = useState('')
  const [sent,   setSent]   = useState(false)
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setErr(error.message); setBusy(false); return }
    setSent(true); setBusy(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft size={16}/> Back to login
        </Link>
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-emerald-400"/>
            </div>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white mb-3">Check your email</h1>
            <p className="text-white/50">We sent a password reset link to <span className="text-white">{email}</span>. Check your inbox and click the link.</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white mb-2">Forgot password?</h1>
            <p className="text-white/45 mb-8">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label text-white/45">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"/>
              </div>
              {err && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{err}</div>}
              <button type="submit" disabled={busy} className="w-full bg-[#C8473A] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#D9584B] transition-all disabled:opacity-50">
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
