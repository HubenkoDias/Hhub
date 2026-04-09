'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 12,
  ]
  const score = checks.filter(Boolean).length
  const color = score <= 1 ? 'bg-red-400' : score === 2 ? 'bg-amber-400' : score === 3 ? 'bg-blue-400' : 'bg-emerald-500'
  const label = ['Too weak', 'Weak', 'Good', 'Strong', 'Very strong'][score]
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i < score ? color : 'bg-white/10'}`} />
        ))}
      </div>
      <p className="text-xs text-white/35">{label}</p>
    </div>
  )
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const router  = useRouter()
  const params  = useSearchParams()
  const defRole = (params.get('role') || 'qa') as 'qa' | 'company'

  const [email,     setEmail]     = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [pass,      setPass]      = useState('')
  const [pass2,     setPass2]     = useState('')
  const [role,      setRole]      = useState<'qa' | 'company'>(defRole)
  const [show,      setShow]      = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)

    try {
      if (mode === 'register') {
        if (!firstName.trim()) { setErr('First name is required'); return }
        if (pass !== pass2)    { setErr('Passwords do not match'); return }
        if (pass.length < 8)   { setErr('Password must be at least 8 characters'); return }
        if (!/[A-Z]/.test(pass)) { setErr('Password must contain an uppercase letter'); return }
        if (!/[0-9]/.test(pass)) { setErr('Password must contain a number'); return }

        const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

        const { data, error } = await supabase.auth.signUp({ email, password: pass })
        if (error) throw error

        if (data.user) {
          // Create profile row
          await supabase.from('profiles').upsert(
            { user_id: data.user.id, role },
            { onConflict: 'user_id' }
          )

          // Create role-specific profile with real name
          if (role === 'qa') {
            await supabase.from('qa_profiles').upsert(
              {
                user_id: data.user.id,
                full_name: fullName,
                skills: [],
                is_public: true,
                verification_status: 'pending',
              },
              { onConflict: 'user_id' }
            )
          } else {
            await supabase.from('company_profiles').upsert(
              {
                user_id: data.user.id,
                company_name: fullName,
              },
              { onConflict: 'user_id' }
            )
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(200,71,58,0.15) 0%, transparent 60%)' }} />
        <Link href="/" className="relative z-10 flex items-center gap-2 text-white">
          <ArrowLeft size={18} />
          <span className="text-xl font-bold">HHub</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Quality assurance,<br /><span className="text-[#C8473A]">done right.</span>
          </h2>
          <p className="text-white/50 leading-relaxed">Join the platform where QA specialists and companies find each other.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 text-white mb-8">
            <ArrowLeft size={18} />
            <span className="text-lg font-bold">HHub</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-white/50 mt-2">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Link href={mode === 'login' ? '/auth/register' : '/auth/login'} className="text-white underline underline-offset-4">
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </Link>
            </p>
          </div>

          {mode === 'register' && (
            <div className="mb-6">
              <label className="label text-white/50">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'qa',      l: 'QA Specialist', d: 'I test software' },
                  { v: 'company', l: 'Company',        d: "I'm hiring QA" },
                ].map(({ v, l, d }) => (
                  <button key={v} type="button" onClick={() => setRole(v as 'qa' | 'company')}
                    className={`p-4 rounded-xl border text-left transition-all ${role === v ? 'bg-white text-[#0F0F0F] border-white' : 'bg-white/5 text-white border-white/10 hover:border-white/30'}`}>
                    <div className="font-semibold text-sm">{l}</div>
                    <div className={`text-xs mt-0.5 ${role === v ? 'text-[#0F0F0F]/60' : 'text-white/40'}`}>{d}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-white/50">First name *</label>
                  <input
                    type="text" required value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="label text-white/50">Last name</label>
                  <input
                    type="text" value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label text-white/50">Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
              />
            </div>

            <div>
              <label className="label text-white/50">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'} required value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 pr-12"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && pass && <PasswordStrength password={pass} />}
            </div>

            {mode === 'register' && (
              <div>
                <label className="label text-white/50">Confirm password</label>
                <input
                  type={show ? 'text' : 'password'} required value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  placeholder="••••••••"
                  className="input bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                />
              </div>
            )}

            {err && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {err}
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <Link href="/auth/forgot-password" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-[#C8473A] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#B33D31] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
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
