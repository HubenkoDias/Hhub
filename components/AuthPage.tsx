'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function AuthPage({ mode }: { mode: 'login'|'register' }) {
  const router  = useRouter()
  const params  = useSearchParams()
  const defRole = (params.get('role') || 'qa') as 'qa'|'company'

  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [pass2,   setPass2]   = useState('')
  const [role,    setRole]    = useState<'qa'|'company'>(defRole)
  const [show,    setShow]    = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (mode === 'register') {
        if (pass !== pass2)     { setErr('Passwords do not match'); return }
        if (pass.length < 8)    { setErr('Password must be at least 8 characters'); return }
        const { data, error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').insert({ user_id: data.user.id, role })
          if (role === 'qa') {
            await supabase.from('qa_profiles').insert({ user_id: data.user.id, full_name: '', skills: [] })
          } else {
            await supabase.from('company_profiles').insert({ user_id: data.user.id, company_name: '' })
          }
          router.push('/dashboard')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (e: any) {
      setErr(e.message || 'Something went wrong')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 30% 70%, rgba(200,71,58,0.15) 0%, transparent 60%)' }}/>
        <Link href="/" className="relative z-10 flex items-center gap-2 text-white">
          <ArrowLeft size={18}/>
          <span style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold">HHub</span>
        </Link>
        <div className="relative z-10">
          <div className="flex gap-3 mb-8">
            {[{num:'500+',label:'Verified QA specialists'},{num:'200+',label:'Companies hiring'}].map(({ num, label }) => (
              <div key={num} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1">
                <div style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white">{num}</div>
                <div className="text-white/50 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
          <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold text-white leading-tight">
            Quality assurance,<br/><span className="text-[#C8473A]">done right.</span>
          </h2>
          <p className="text-white/50 mt-4 leading-relaxed">Join the platform where QA specialists and companies find each other.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 text-white mb-8">
            <ArrowLeft size={18}/>
            <span style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold">HHub</span>
          </Link>
          <div className="mb-8">
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-white/50 mt-2">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Link href={mode==='login' ? '/auth/register' : '/auth/login'} className="text-white underline underline-offset-4">
                {mode==='login' ? 'Sign up' : 'Log in'}
              </Link>
            </p>
          </div>

          {mode === 'register' && (
            <div className="mb-6">
              <label className="label text-white/50">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {[{v:'qa',l:'QA Specialist',d:'I test software'},{v:'company',l:'Company',d:"I'm hiring QA"}].map(({ v, l, d }) => (
                  <button key={v} type="button" onClick={() => setRole(v as 'qa'|'company')}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${role===v ? 'bg-white text-[#0F0F0F] border-white' : 'bg-white/5 text-white border-white/10 hover:border-white/30'}`}>
                    <div className="font-medium text-sm">{l}</div>
                    <div className={`text-xs mt-0.5 ${role===v ? 'text-[#0F0F0F]/60' : 'text-white/40'}`}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label text-white/50">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"/>
            </div>
            <div>
              <label className="label text-white/50">Password</label>
              <div className="relative">
                <input type={show?'text':'password'} required value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 pr-12"/>
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            {mode==='register' && (
              <div>
                <label className="label text-white/50">Confirm password</label>
                <input type={show?'text':'password'} required value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"/>
              </div>
            )}
            {err && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{err}</div>}
            {mode==='login' && (
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-xs text-white/40 hover:text-white/70 transition-colors">Forgot password?</Link>
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full bg-[#C8473A] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#D9584B] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Please wait…' : mode==='login' ? 'Log in' : 'Create account'}
            </button>
          </form>
          <p className="text-white/30 text-xs text-center mt-6">
            By continuing you agree to our{' '}
            <Link href="/terms" className="text-white/50 hover:text-white transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
