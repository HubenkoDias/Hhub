import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, Shield, Zap, Users } from 'lucide-react'

export default function Home() {
  return (
    <>
      <Navbar/>
      <main>
        {/* HERO */}
        <section className="min-h-screen bg-[#0F0F0F] flex items-center relative overflow-hidden">
          <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%, rgba(200,71,58,0.08) 0%, transparent 60%)' }}/>
          <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center pt-20 pb-16">
            <div className="animate-fade-up anim-delay-1">
              <div className="aspect-[4/5] bg-[#1A1A1A] rounded-3xl overflow-hidden border border-white/5 flex items-center justify-center relative">
                <span className="text-white/10 font-mono text-sm text-center">[Hero image]<br/>Place your photo here</span>
                <div className="absolute -bottom-4 -right-4 bg-[#C8473A] text-white rounded-2xl px-5 py-3 font-mono text-sm font-medium shadow-xl">
                  500+ Verified QA
                </div>
              </div>
            </div>
            <div className="text-white">
              <div className="animate-fade-up anim-delay-2">
                <p className="section-tag text-white/40 mb-4">QA Platform</p>
                <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
                  QA experts.<br/>Reliable results.<br/><span className="text-[#C8473A]">Every time.</span>
                </h1>
              </div>
              <div className="animate-fade-up anim-delay-3">
                <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">
                  Find trusted software testers and QA teams for your business. Connect with vetted professionals for projects of any size — short-term or long-term.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap animate-fade-up anim-delay-4">
                <Link href="/browse/specialists" className="btn-accent">Hire testers</Link>
                <Link href="/#how-it-works" className="inline-flex items-center justify-center bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-medium text-sm hover:bg-white/20 transition-all duration-200">How it works</Link>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED BY */}
        <section className="bg-[#D8D4CB] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <p className="section-tag mb-2">Trusted by</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-3xl md:text-4xl font-bold">QA teams trusted by<br/>industry leaders</h2>
              <p className="text-[#0F0F0F]/60 mt-3 max-w-md mx-auto text-sm">Top companies choose our vetted testers for reliable, high-quality assurance on every project.</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {['LOGO','EGGS','THE PAAK','IDEA','IDEA','ECHOES'].map((n,i) => (
                <div key={i} className="bg-[#EAE7E0] rounded-xl border border-[#D8D4CB] py-6 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold text-[#0F0F0F]/40 tracking-wider">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* KEY FEATURES */}
        <section className="bg-[#EAE7E0] py-24" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="section-tag mb-3">Key Platform Features</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold">QA talent. Trusted results.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon:Shield, tag:'EXPERTISE',  title:'Verified QA specialists', desc:'Work with skilled testers who deliver reliable quality assurance. Every specialist is manually vetted by our team.', link:'/browse/specialists', cta:'Browse' },
                { icon:Zap,    tag:'ENGAGEMENT', title:'Flexible hiring models',   desc:'Select short-term or ongoing QA support to match your project requirements. From freelance to full-time.', link:'/auth/register?role=company', cta:'Explore' },
                { icon:Users,  tag:'COMMUNITY',  title:'Collaborative QA network', desc:'Connect with professionals, share knowledge, and advance your QA skills in a dedicated ecosystem.', link:'/auth/register?role=qa', cta:'Join' },
              ].map(({ icon:Icon, tag, title, desc, link, cta }) => (
                <div key={tag} className="bg-[#D8D4CB] rounded-3xl p-8 border border-[#D8D4CB]/50 hover:border-[#0F0F0F]/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group">
                  <div className="w-12 h-12 bg-[#0F0F0F] rounded-2xl flex items-center justify-center mb-6">
                    <Icon size={20} className="text-[#EAE7E0]"/>
                  </div>
                  <p className="section-tag mb-2">{tag}</p>
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold mb-3">{title}</h3>
                  <p className="text-[#0F0F0F]/60 text-sm leading-relaxed mb-6">{desc}</p>
                  <Link href={link} className="inline-flex items-center gap-2 text-sm font-medium text-[#0F0F0F] hover:gap-3 transition-all duration-200">
                    {cta} <ArrowRight size={16}/>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#0F0F0F] py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <p className="section-tag text-white/40 mb-3">FAQ</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white">Common questions,<br/>straight answers.</h2>
            </div>
            <div className="space-y-0">
              {[
                { q:'How do I hire a QA expert?', a:"Share your project details and requirements. We'll match you with qualified QA professionals, whether short-term or ongoing." },
                { q:'What projects can you help with?', a:'We support software testing for web, mobile, and enterprise apps — serving startups and established businesses alike.' },
                { q:'Are your testers screened?', a:'All QA specialists are carefully vetted for skills, experience, and reliability before joining our network.' },
                { q:'Can I hire a full QA team?', a:'You can hire individual testers or a dedicated QA team. We help you find the right skills for your project.' },
                { q:'How soon can I start?', a:'Most projects are matched within a few business days. Timelines depend on your requirements.' },
              ].map(({ q, a }) => (
                <details key={q} className="group border-b border-white/10 py-6">
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <h3 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold text-white">{q}</h3>
                    <span className="text-white/40 group-open:rotate-45 transition-transform duration-200 text-2xl leading-none flex-shrink-0 ml-4">+</span>
                  </summary>
                  <p className="text-white/60 mt-4 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#EAE7E0] py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold">Quality assurance,<br/>delivered right</h2>
              </div>
              <div>
                <p className="text-[#0F0F0F]/60 mb-6 leading-relaxed">Connect with vetted QA professionals for your next project or join a network of experienced testers.</p>
                <div className="flex gap-3 flex-wrap">
                  <Link href="/browse/specialists" className="btn-primary">Hire testers</Link>
                  <Link href="/auth/register"      className="btn-secondary">Join now</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}
