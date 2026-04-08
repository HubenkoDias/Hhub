import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center">
        <p style={{ fontFamily:'var(--font-display)' }} className="text-[180px] font-bold text-white/5 leading-none select-none">404</p>
        <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold text-white -mt-8 mb-4">Page not found</h1>
        <p className="text-white/45 mb-8">This page doesn't exist or has been moved.</p>
        <Link href="/" className="btn-accent">Go home</Link>
      </div>
    </div>
  )
}
