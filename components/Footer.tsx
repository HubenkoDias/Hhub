import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0F0F0F] text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold mb-3">HHub</div>
            <p className="text-white/40 text-sm leading-relaxed">QA expertise. Trusted results. Connect.</p>
            <p className="text-white/30 text-xs font-mono mt-4">info@hhub.com</p>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Platform</p>
            <div className="flex flex-col gap-3">
              <Link href="/browse/specialists"      className="text-sm text-white/60 hover:text-white transition-colors">Find QA Specialists</Link>
              <Link href="/browse/companies"        className="text-sm text-white/60 hover:text-white transition-colors">Browse Companies</Link>
              <Link href="/auth/register?role=qa"   className="text-sm text-white/60 hover:text-white transition-colors">Join as QA</Link>
              <Link href="/auth/register?role=company" className="text-sm text-white/60 hover:text-white transition-colors">Post a Job</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Company</p>
            <div className="flex flex-col gap-3">
              <Link href="/insights"      className="text-sm text-white/60 hover:text-white transition-colors">Insights</Link>
              <Link href="/#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">How it works</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Legal</p>
            <div className="flex flex-col gap-3">
              <Link href="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms"   className="text-sm text-white/60 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-white/30 text-xs font-mono">© 2025 HHub. All rights reserved.</p>
          <p className="text-white/20 text-xs font-mono">Built for QA professionals worldwide</p>
        </div>
      </div>
    </footer>
  )
}
