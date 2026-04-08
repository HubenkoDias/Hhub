import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0F0F0F]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white font-mono font-bold text-xs">HH</span>
              </div>
              <span style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold text-white">HHub</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              A QA-focused hub connecting experienced software testers with companies that need reliable quality assurance.
            </p>
            <p className="text-white/25 text-xs font-mono mt-4">Founded by Hubenko Dias</p>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Platform</p>
            <div className="flex flex-col gap-3">
              {[['Find Specialists','/browse/specialists'],['Browse Companies','/browse/companies'],['Join as QA','/auth/register?role=qa'],['Post a Job','/auth/register?role=company']].map(([l,h]) => (
                <Link key={h} href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Company</p>
            <div className="flex flex-col gap-3">
              {[['About','/about'],['Insights','/insights'],['How it works','/#how-it-works']].map(([l,h]) => (
                <Link key={h} href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Legal</p>
            <div className="flex flex-col gap-3">
              {[['Privacy Policy','/privacy'],['Terms of Service','/terms']].map(([l,h]) => (
                <Link key={h} href={h} className="text-sm text-white/50 hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
        {/* Social */}
        <div className="flex gap-4 mb-8">
          <a href="https://www.linkedin.com/company/hhubqa" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </a>
          <Link href="/team" className="text-white/40 hover:text-white transition-colors text-sm">Team</Link>
        </div>
      <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-white/25 text-xs font-mono">© 2025 HHub. All rights reserved.</p>
          <p className="text-white/20 text-xs font-mono">Built for QA professionals worldwide</p>
        </div>
      </div>
    </footer>
  )
}
