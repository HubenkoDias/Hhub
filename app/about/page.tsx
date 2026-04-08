import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckCircle, Target, Users, Zap } from 'lucide-react'

export default function About() {
  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        {/* Hero */}
        <div className="bg-[#0F0F0F] py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="section-tag text-white/40 mb-4">About HHub</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-5xl md:text-6xl font-bold text-white mb-6">Built for QA.<br/><span className="text-[#C8473A]">Built right.</span></h1>
            <p className="text-white/55 text-lg leading-relaxed max-w-2xl mx-auto">
              HHub is a growing QA-focused hub built to connect experienced software testers and companies that need reliable quality assurance.
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <p className="section-tag mb-3">Our Mission</p>
              <h2 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold mb-4">A trusted QA ecosystem</h2>
              <p className="text-[#0F0F0F]/60 leading-relaxed mb-4">
                The platform combines a professional community of vetted QA specialists with a clear entry point for businesses looking to hire testers or QA teams for real-world projects — from short-term engagements to long-term collaboration.
              </p>
              <p className="text-[#0F0F0F]/60 leading-relaxed">
                HHub is designed as a center of expertise where testers can share knowledge, grow professionally, and work on meaningful projects, while companies can confidently find QA professionals who understand product quality, processes, and delivery expectations.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon:Target, title:'Focused', desc:'100% dedicated to QA — not another generic marketplace' },
                { icon:CheckCircle, title:'Verified', desc:'Every specialist manually reviewed before joining' },
                { icon:Users, title:'Community', desc:'A network where QA professionals grow together' },
                { icon:Zap, title:'Efficient', desc:'Connect directly, no middlemen, no friction' },
              ].map(({ icon:Icon, title, desc }) => (
                <div key={title} className="card">
                  <div className="w-10 h-10 bg-[#0F0F0F] rounded-xl flex items-center justify-center mb-3">
                    <Icon size={18} className="text-white"/>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{title}</h3>
                  <p className="text-[#0F0F0F]/50 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vision */}
          <div className="bg-[#0F0F0F] rounded-3xl p-10 mb-20 text-center">
            <p className="section-tag text-white/40 mb-4">Long-term vision</p>
            <h2 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold text-white mb-4">The place people turn to<br/>when they need QA done properly.</h2>
            <p className="text-white/50 max-w-xl mx-auto leading-relaxed">
              We're building the definitive QA ecosystem — a trusted network where quality is the standard, not the exception.
            </p>
          </div>

          {/* Founder */}
          <div className="text-center">
            <p className="section-tag mb-6">Founder</p>
            <div className="inline-block">
              <div className="w-24 h-24 bg-[#D8D4CB] rounded-3xl mx-auto mb-4 flex items-center justify-center">
                <span style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold text-[#0F0F0F]/30">D</span>
              </div>
              <h3 style={{ fontFamily:'var(--font-display)' }} className="text-2xl font-bold">Hubenko Dmytro</h3>
              <p className="text-[#0F0F0F]/50 text-sm mt-1">Founder & CEO, HHub</p>
            </div>
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
