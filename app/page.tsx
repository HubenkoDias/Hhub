'use client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, Shield, Zap, Users, CheckCircle, Star, MapPin, DollarSign } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Typing animation hook
function useTyping(phrases: string[], speed = 60, pause = 1800) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(i => i + 1), speed)
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(i => i - 1), speed / 2)
    } else if (deleting && charIdx === 0) {
      setDeleting(false)
      setPhraseIdx(i => (i + 1) % phrases.length)
    }
    setDisplayed(current.slice(0, charIdx))
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause])

  return displayed
}

// Counter animation hook
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start || target === 0) return
    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

// Intersection observer hook
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

const COMPANIES = ['LOGO','NEXUS','EGGS','THE PAAK','IDEA','ORBIS','ECHOES','VANTA','FORGE','PRISM']

export default function Home() {
  const typing = useTyping(['QA experts.', 'Reliable results.', 'Every time.'])
  const [stats, setStats] = useState({ qa: 0, companies: 0, reviews: 0 })
  const { ref: statsRef, inView: statsInView } = useInView()

  const qaCount      = useCounter(stats.qa,       1600, statsInView)
  const coCount      = useCounter(stats.companies, 1600, statsInView)
  const reviewCount  = useCounter(stats.reviews,   1600, statsInView)

  const [featuredSpecs, setFeaturedSpecs] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('qa_profiles').select('*', { count:'exact', head:true }).eq('verification_status','verified'),
      supabase.from('company_profiles').select('*', { count:'exact', head:true }),
      supabase.from('reviews').select('*', { count:'exact', head:true }),
      supabase.from('qa_profiles').select('user_id,full_name,title,skills,photo_url,hourly_rate').eq('verification_status','verified').eq('is_public',true).limit(3),
    ]).then(([qa, co, rev, specs]) => {
      setStats({ qa: qa.count||0, companies: co.count||0, reviews: rev.count||0 })
      if (specs.data && specs.data.length > 0) setFeaturedSpecs(specs.data)
    })
  }, [])

  // Featured specialists - only real verified users, no fake data
  const FEATURED = featuredSpecs.map(s => ({
    name: s.full_name || 'QA Specialist',
    role: s.title || 'QA Engineer',
    skills: (s.skills || []).slice(0, 3),
    rate: s.hourly_rate ? `$${'$'}{s.hourly_rate}/hr` : '',
    userId: s.user_id,
  }))

  return (
    <>
      <Navbar/>
      <main>
        {/* HERO */}
        <section className="min-h-screen bg-[#0A0A0A] flex items-center relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C8473A]/8 rounded-full blur-3xl"/>
            <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-[#C8473A]/5 rounded-full blur-3xl"/>
            <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize:'40px 40px' }}/>
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-16 items-center pt-24 pb-20 relative z-10">
            <div className="text-white">
              <div className="animate-fade-up d1">
                <div className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-4 py-2 mb-8">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                  <span className="text-white/55 text-xs font-mono tracking-wide">Live platform · Verified QA network</span>
                </div>
              </div>

              <div className="animate-fade-up d2 mb-6">
                <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.0] tracking-tight">
                  <span className="block text-white/90">{typing || '\u00A0'}<span className="cursor-blink text-[#C8473A]">|</span></span>
                </h1>
              </div>

              <div className="animate-fade-up d3">
                <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-md font-light">
                  Find trusted software testers and QA teams for your business. Connect with vetted professionals — short-term or long-term.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap animate-fade-up d4">
                <HeroButtons/>
              </div>
            </div>

            {/* Featured specialists - only shown if real data exists */}
            {FEATURED.length > 0 && (
            <div className="hidden md:flex flex-col gap-3 animate-fade-up d3">
              <p className="text-white/25 text-xs font-mono tracking-widest uppercase mb-1">Featured specialists</p>
              {FEATURED.map((s, i) => (
                <a key={i}
                  href={s.userId ? `/specialists/${s.userId}` : '/browse/specialists'}
                  className="flip-card h-[88px] block">
                  <div className="flip-card-inner h-full">
                    {/* Front */}
                    <div className="flip-card-front bg-white/5 border border-white/8 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-white/60 font-bold text-sm">{s.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-semibold">{s.name}</p>
                          <CheckCircle size={12} className="text-emerald-400"/>
                        </div>
                        <p className="text-white/40 text-xs">{s.role}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.skills.map(sk => <span key={sk} className="text-[10px] bg-white/8 text-white/45 px-2 py-0.5 rounded-full font-mono">{sk}</span>)}
                        </div>
                      </div>
                      <div className="text-white/50 text-xs font-mono flex-shrink-0">{s.rate}</div>
                    </div>
                    {/* Back */}
                    <div className="flip-card-back bg-[#C8473A] p-4 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm flex items-center gap-2 pointer-events-none">
                        View full profile <ArrowRight size={14}/>
                      </span>
                    </div>
                  </div>
                </a>
              ))}
              <Link href="/browse/specialists" className="mt-1 bg-white/6 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/8">
                Browse all specialists <ArrowRight size={12}/>
              </Link>
            </div>
            )}
          </div>
        </section>

        {/* MARQUEE */}
        <section className="bg-[#0A0A0A] border-t border-white/6 py-5 overflow-hidden">
          <div className="marquee-track">
            {[...COMPANIES, ...COMPANIES].map((name, i) => (
              <div key={i} className="flex items-center gap-10 px-8">
                <span className="text-white/20 font-mono text-sm font-bold tracking-widest whitespace-nowrap">{name}</span>
                <span className="text-white/10 text-lg">·</span>
              </div>
            ))}
          </div>
        </section>

        {/* STATS — animated counters */}
        <section ref={statsRef} className="bg-[#EAE7E0] py-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { value: qaCount,     label:'Verified QA specialists', suffix:'+' },
                { value: coCount,     label:'Companies hiring',         suffix:'+' },
                { value: reviewCount, label:'Positive reviews',         suffix:'+' },
              ].map(({ value, label, suffix }, i) => (
                <div key={i}>
                  <div style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl font-extrabold text-[#0F0F0F] tabular-nums">
                    {value > 0 ? `${value}${suffix}` : '0'}
                  </div>
                  <p className="text-[#0F0F0F]/45 text-sm mt-2 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-[#EAE7E0] py-24" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="section-tag mb-3">How it works</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-extrabold">Simple. Fast. Reliable.</h2>
              <p className="text-[#0F0F0F]/45 mt-4 max-w-md mx-auto">Connect with the right QA talent in three simple steps</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n:'01', icon:Shield, tag:'SEARCH',  title:'Find verified talent',   desc:'Browse our curated pool of vetted QA specialists. Filter by skills, availability, rate, and location.' },
                { n:'02', icon:Zap,    tag:'CONNECT', title:'Send a request',          desc:'Reach out with a personalised message. Get a response within 24 hours.' },
                { n:'03', icon:Users,  tag:'WORK',    title:'Start collaborating',     desc:'Once connected, communicate directly and build a working relationship that delivers results.' },
              ].map(({ n, icon:Icon, tag, title, desc }) => (
                <div key={n} className="card-hover group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-[#0F0F0F] rounded-2xl flex items-center justify-center group-hover:bg-[#C8473A] transition-all duration-300">
                      <Icon size={20} className="text-white"/>
                    </div>
                    <span className="font-mono text-5xl font-extrabold text-[#0F0F0F]/6 leading-none">{n}</span>
                  </div>
                  <p className="section-tag mb-2">{tag}</p>
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-[#0F0F0F]/50 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES dark */}
        <section className="bg-[#0A0A0A] py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="section-tag text-white/35 mb-4">Why HHub</p>
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-extrabold text-white mb-6">QA talent.<br/>Trusted results.</h2>
                <p className="text-white/45 leading-relaxed mb-8">Every specialist on HHub is manually vetted. We don't just list profiles — we curate a community of professionals you can trust.</p>
                <div className="space-y-3.5">
                  {['Manual verification of every QA specialist','Transparent profiles with certificates and portfolio','Direct messaging — no middlemen','Flexible hiring: freelance, part-time, full-time'].map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C8473A]/15 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={12} className="text-[#C8473A]"/>
                      </div>
                      <span className="text-white/65 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/browse/specialists" className="btn-accent mt-8 inline-flex">Browse specialists <ArrowRight size={16}/></Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{l:'Avg response',v:'< 24h',e:'⚡'},{l:'Satisfaction',v:'98%',e:'⭐'},{l:'QA skills covered',v:'25+',e:'🛠'},{l:'Support',v:'24/7',e:'💬'}].map(({ l, v, e }) => (
                  <div key={l} className="bg-white/4 border border-white/8 rounded-2xl p-6 text-center hover:bg-white/6 transition-colors">
                    <div className="text-3xl mb-2">{e}</div>
                    <div style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-extrabold text-white">{v}</div>
                    <div className="text-white/35 text-xs mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#EAE7E0] py-24">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="section-tag mb-3">FAQ</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-extrabold">Common questions,<br/>straight answers.</h2>
            </div>
            <div className="space-y-3">
              {[
                { q:'How do I hire a QA expert?', a:"Browse our specialists, use filters to narrow by skills, rate and availability. Send a connection request with your project details." },
                { q:'How are specialists verified?', a:'Every QA specialist is manually reviewed by our team. We check work experience, skills, references, and certificates before approval.' },
                { q:'Can I hire a full QA team?', a:'Yes. Connect with multiple specialists and build a dedicated QA team tailored to your project scale and requirements.' },
                { q:'What engagement models are available?', a:'Freelance (project-based), part-time (ongoing), or full-time. Each specialist sets their own availability and rate.' },
                { q:'How soon can I start?', a:'Most projects are matched within 1–3 business days. Once connected, you can start immediately.' },
              ].map(({ q, a }) => (
                <details key={q} className="group bg-white rounded-2xl border border-[#ECEAE4] overflow-hidden">
                  <summary className="flex justify-between items-center cursor-pointer list-none p-6 select-none">
                    <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold pr-4">{q}</h3>
                    <div className="w-8 h-8 rounded-full bg-[#EAE7E0] flex items-center justify-center flex-shrink-0 group-open:bg-[#C8473A] transition-colors duration-300">
                      <span className="text-[#0F0F0F] group-open:text-white font-bold text-xl leading-none transition-all duration-300 group-open:rotate-45 inline-block">+</span>
                    </div>
                  </summary>
                  <div className="px-6 pb-6 -mt-1">
                    <p className="text-[#0F0F0F]/55 leading-relaxed">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#C8473A] py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize:'32px 32px' }}/>
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-6xl font-extrabold text-white mb-6">Quality assurance,<br/>delivered right.</h2>
            <p className="text-white/70 text-lg mb-10 max-w-md mx-auto">Join companies and specialists already building better software together.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <CTAButtons/>
            </div>
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}


function CTAButtons() {
  const [user, setUser] = useState<any>(undefined)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setUser(null); return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
      if (p) setRole(p.role)
    })
  }, [])

  if (user === undefined) return null

  if (user && (role === 'qa' || role === 'admin')) return (
    <>
      <Link href="/browse/specialists" className="bg-white text-[#C8473A] px-8 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all hover:scale-[1.02] inline-flex items-center gap-2">
        Find QA colleagues <ArrowRight size={18} />
      </Link>
      <Link href="/browse/companies" className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-medium text-base hover:bg-white/10 transition-all inline-flex items-center gap-2">
        Browse companies
      </Link>
    </>
  )

  if (user && role === 'company') return (
    <Link href="/browse/specialists" className="bg-white text-[#C8473A] px-8 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all hover:scale-[1.02] inline-flex items-center gap-2">
      Hire QA testers <ArrowRight size={18} />
    </Link>
  )

  return (
    <>
      <Link href="/browse/specialists" className="bg-white text-[#C8473A] px-8 py-4 rounded-full font-bold text-base hover:bg-white/90 transition-all hover:scale-[1.02] inline-flex items-center gap-2">
        Find QA talent <ArrowRight size={18} />
      </Link>
      <Link href="/auth/register?role=qa" className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-medium text-base hover:bg-white/10 transition-all inline-flex items-center gap-2">
        Join as QA specialist
      </Link>
    </>
  )
}


function HeroButtons() {
  const [user, setUser] = useState<any>(undefined)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setUser(null); return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
      if (p) setRole(p.role)
    })
  }, [])

  if (user === undefined) return <div className="h-14 w-64 bg-white/5 rounded-full animate-pulse" />

  // Logged in as QA or Admin - community-focused
  if (user && (role === 'qa' || role === 'admin')) return (
    <>
      <Link href="/browse/specialists" className="btn-accent text-base px-8 py-4 rounded-full">
        Find QA colleagues <ArrowRight size={18} />
      </Link>
      <Link href="/browse/companies" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-8 py-4 rounded-full font-medium text-base hover:bg-white/14 transition-all">
        Browse companies
      </Link>
    </>
  )

  // Logged in as Company
  if (user && role === 'company') return (
    <>
      <Link href="/browse/specialists" className="btn-accent text-base px-8 py-4 rounded-full">
        Hire QA testers <ArrowRight size={18} />
      </Link>
      <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-8 py-4 rounded-full font-medium text-base hover:bg-white/14 transition-all">
        My profile
      </Link>
    </>
  )

  // Not logged in
  return (
    <>
      <Link href="/browse/specialists" className="btn-accent text-base px-8 py-4 rounded-full">
        Find QA talent <ArrowRight size={18} />
      </Link>
      <Link href="/auth/register?role=qa" className="inline-flex items-center gap-2 bg-white/8 text-white border border-white/15 px-8 py-4 rounded-full font-medium text-base hover:bg-white/14 transition-all">
        Join as QA
      </Link>
    </>
  )
}
