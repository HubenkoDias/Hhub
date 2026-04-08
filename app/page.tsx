import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, Shield, Zap, Users, Star, CheckCircle } from 'lucide-react'

export default function Home() {
  return (
    <>
      <Navbar/>
      <main>
        {/* HERO */}
        <section className="min-h-screen bg-[#0F0F0F] flex items-center relative overflow-hidden">
          <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 15% 50%, rgba(200,71,58,0.12) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(200,71,58,0.06) 0%, transparent 50%)' }}/>
          {/* Grain overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage:'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")' }}/>

          <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-16 items-center pt-24 pb-20">
            <div className="text-white">
              <div className="animate-fade-up d1">
                <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 rounded-full px-4 py-2 mb-8">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                  <span className="text-white/60 text-xs font-mono">500+ Verified QA Specialists</span>
                </div>
              </div>
              <div className="animate-fade-up d2">
                <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl lg:text-[72px] font-bold leading-[1.02] mb-6">
                  QA experts.<br/>
                  Reliable results.<br/>
                  <span className="text-[#C8473A]">Every time.</span>
                </h1>
              </div>
              <div className="animate-fade-up d3">
                <p className="text-white/55 text-lg leading-relaxed mb-8 max-w-md">
                  Find trusted software testers and QA teams for your business. Connect with vetted professionals for projects of any size.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap animate-fade-up d4">
                <Link href="/browse/specialists" className="btn-accent text-base px-8 py-4">
                  Hire testers <ArrowRight size={18}/>
                </Link>
                <Link href="/auth/register?role=qa" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-medium text-base hover:bg-white/15 transition-all duration-200">
                  Join as QA
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mt-12 animate-fade-up d4">
                {[['500+','Verified specialists'],['200+','Companies hiring'],['98%','Satisfaction rate']].map(([n,l]) => (
                  <div key={l}>
                    <div style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold text-white">{n}</div>
                    <div className="text-white/40 text-xs mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side - visual */}
            <div className="hidden md:block animate-fade-up d2">
              <div className="relative">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                  <div className="text-xs font-mono text-white/30 mb-4 uppercase tracking-widest">Featured specialists</div>
                  {[
                    { name:'Alex M.', role:'Senior QA Engineer', skills:['Cypress','API Testing','CI/CD'], rate:'$65/hr', verified:true },
                    { name:'Sarah K.', role:'Automation Lead', skills:['Playwright','Python','Docker'], rate:'$80/hr', verified:true },
                    { name:'John D.', role:'QA Analyst', skills:['Manual Testing','JIRA','Agile'], rate:'$45/hr', verified:true },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 mb-3 last:mb-0">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span style={{ fontFamily:'var(--font-display)' }} className="text-white/60 font-bold">{s.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          <CheckCircle size={12} className="text-emerald-400"/>
                        </div>
                        <p className="text-white/40 text-xs">{s.role}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.skills.map(sk => <span key={sk} className="text-[10px] bg-white/8 text-white/50 px-2 py-0.5 rounded-full font-mono">{sk}</span>)}
                        </div>
                      </div>
                      <div className="text-white/60 text-xs font-mono flex-shrink-0">{s.rate}</div>
                    </div>
                  ))}
                  <Link href="/browse/specialists" className="mt-4 w-full bg-white/10 hover:bg-white/15 text-white text-sm font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    Browse all specialists <ArrowRight size={14}/>
                  </Link>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-[#C8473A] text-white rounded-2xl px-4 py-3 font-mono text-sm font-medium shadow-xl">
                  Verified & trusted ✓
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED BY */}
        <section className="bg-[#D8D4CB] py-14">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-center mb-8">Trusted by industry leaders</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {['LOGO','EGGS','THE PAAK','IDEA','NEXUS','ECHOES'].map((n,i) => (
                <div key={i} className="bg-white/60 rounded-xl py-5 flex items-center justify-center border border-white/40">
                  <span className="font-mono text-xs font-bold text-[#0F0F0F]/30 tracking-wider">{n}</span>
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
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold">Simple. Fast. Reliable.</h2>
              <p className="text-[#0F0F0F]/50 mt-4 max-w-md mx-auto">Connect with the right QA talent in three simple steps</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n:'01', icon:Shield, tag:'SEARCH', title:'Find verified talent', desc:'Browse our curated pool of vetted QA specialists. Filter by skills, availability, rate, and location.' },
                { n:'02', icon:Zap,    tag:'CONNECT', title:'Send a request', desc:'Reach out with a personalised message explaining your project needs. Get a response within 24 hours.' },
                { n:'03', icon:Users,  tag:'WORK',    title:'Start collaborating', desc:'Once connected, communicate directly and build a working relationship that delivers results.' },
              ].map(({ n, icon:Icon, tag, title, desc }) => (
                <div key={n} className="card-hover group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-[#0F0F0F] rounded-2xl flex items-center justify-center group-hover:bg-[#C8473A] transition-colors duration-300">
                      <Icon size={20} className="text-white"/>
                    </div>
                    <span className="font-mono text-4xl font-bold text-[#0F0F0F]/8">{n}</span>
                  </div>
                  <p className="section-tag mb-2">{tag}</p>
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold mb-2">{title}</h3>
                  <p className="text-[#0F0F0F]/55 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-[#0F0F0F] py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="section-tag text-white/40 mb-4">Why HHub</p>
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white mb-6">QA talent.<br/>Trusted results.</h2>
                <p className="text-white/50 leading-relaxed mb-8">Every specialist on HHub is manually vetted for skills, experience, and reliability. We don't just list profiles — we curate a community of professionals you can trust.</p>
                <div className="space-y-4">
                  {[
                    'Manual verification of every QA specialist',
                    'Transparent profiles with certificates and portfolio',
                    'Direct messaging — no middlemen',
                    'Flexible hiring: freelance, part-time, full-time',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C8473A]/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={12} className="text-[#C8473A]"/>
                      </div>
                      <span className="text-white/70 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/browse/specialists" className="btn-accent mt-8 inline-flex">
                  Browse specialists <ArrowRight size={16}/>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label:'Verified QA', value:'500+', icon:'🏆' },
                  { label:'Companies',   value:'200+', icon:'🏢' },
                  { label:'Avg. response','value':'< 24h', icon:'⚡' },
                  { label:'Satisfaction', value:'98%',   icon:'⭐' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                    <div className="text-3xl mb-2">{icon}</div>
                    <div style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white">{value}</div>
                    <div className="text-white/40 text-xs mt-1">{label}</div>
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
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold">Common questions,<br/>straight answers.</h2>
            </div>
            <div className="space-y-3">
              {[
                { q:'How do I hire a QA expert?', a:"Browse our specialists, use filters to narrow down by skills, rate, and availability. Send a connection request with your project details — we'll handle the rest." },
                { q:'How are specialists verified?', a:'Every QA specialist is manually reviewed by our team. We check work experience, skills, references, and certificates before approving any profile.' },
                { q:'Can I hire a full QA team?', a:'Yes. You can connect with multiple specialists and build a dedicated QA team tailored to your project scale and requirements.' },
                { q:'What engagement models are available?', a:'Freelance (project-based), part-time (ongoing), or full-time. Each specialist sets their own availability and rate.' },
                { q:'How soon can I start?', a:'Most projects are matched within 1–3 business days. Once you connect with a specialist, you can start immediately.' },
              ].map(({ q, a }) => (
                <details key={q} className="group bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden">
                  <summary className="flex justify-between items-center cursor-pointer list-none p-6">
                    <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold pr-4">{q}</h3>
                    <div className="w-8 h-8 rounded-full bg-[#EAE7E0] flex items-center justify-center flex-shrink-0 group-open:bg-[#0F0F0F] transition-colors duration-300">
                      <span className="text-[#0F0F0F] group-open:text-white font-bold text-lg leading-none transition-colors duration-300 group-open:rotate-45 inline-block transition-transform">+</span>
                    </div>
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-[#0F0F0F]/60 leading-relaxed">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0F0F0F] py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="section-tag text-white/40 mb-4">Get started today</p>
            <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-6xl font-bold text-white mb-6">Quality assurance,<br/>delivered right.</h2>
            <p className="text-white/50 text-lg mb-10 max-w-md mx-auto">Join hundreds of companies and specialists already building better software together.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/browse/specialists" className="btn-accent text-base px-8 py-4">Hire testers</Link>
              <Link href="/auth/register?role=qa" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-medium text-base hover:bg-white/15 transition-all">Join as QA specialist</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}
