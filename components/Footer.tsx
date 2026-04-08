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
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-white/25 text-xs font-mono">© 2025 HHub. All rights reserved.</p>
          <p className="text-white/20 text-xs font-mono">Built for QA professionals worldwide</p>
        </div>
      </div>
    </footer>
  )
}
