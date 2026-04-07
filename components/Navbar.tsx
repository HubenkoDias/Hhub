'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, X, MessageSquare, User, LogOut, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]           = useState<any>(null)
  const [role, setRole]           = useState<string|null>(null)
  const [mobileOpen, setMobile]   = useState(false)
  const [userMenu, setUserMenu]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUser(data.user)
      supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
        .then(({ data: p }) => { if (p) setRole(p.role) })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session) setRole(null)
    })
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('scroll', onScroll) }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    setUserMenu(false)
  }

  const isHome = pathname === '/'
  const navBg  = scrolled || !isHome
    ? 'bg-[#EAE7E0]/95 backdrop-blur-md border-b border-[#D8D4CB]'
    : 'bg-transparent'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-display)' }} className="text-xl font-bold text-[#0F0F0F]">HHub</span>
          <span className="hidden sm:block text-xs font-mono text-[#0F0F0F]/40 border-l border-[#0F0F0F]/20 pl-2">QA Platform</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/browse/specialists" className="nav-link">Specialists</Link>
          <Link href="/browse/companies"   className="nav-link">Companies</Link>
          <Link href="/insights"           className="nav-link">Insights</Link>
          <Link href="/#how-it-works"      className="nav-link">How it works</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/messages" className="w-9 h-9 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/15 transition-colors">
                <MessageSquare size={16} />
              </Link>
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/10 hover:bg-black/15 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-[#0F0F0F] flex items-center justify-center">
                    <User size={12} className="text-[#EAE7E0]" />
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${userMenu ? 'rotate-180' : ''}`} />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-12 bg-white border border-[#D8D4CB] rounded-2xl shadow-lg py-2 w-44 animate-fade-in">
                    <Link href="/dashboard" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors"><User size={14}/> My Profile</Link>
                    {role === 'admin' && <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors">Admin Panel</Link>}
                    <hr className="my-1 border-[#D8D4CB]"/>
                    <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"><LogOut size={14}/> Log out</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login"    className="nav-link">Log in</Link>
              <Link href="/auth/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMobile(!mobileOpen)}>
          {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#EAE7E0] border-t border-[#D8D4CB] px-6 py-4 flex flex-col gap-4 animate-fade-in">
          <Link href="/browse/specialists" className="nav-link py-1" onClick={() => setMobile(false)}>Specialists</Link>
          <Link href="/browse/companies"   className="nav-link py-1" onClick={() => setMobile(false)}>Companies</Link>
          <Link href="/insights"           className="nav-link py-1" onClick={() => setMobile(false)}>Insights</Link>
          <hr className="border-[#D8D4CB]"/>
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link py-1" onClick={() => setMobile(false)}>My Profile</Link>
              <Link href="/messages"  className="nav-link py-1" onClick={() => setMobile(false)}>Messages</Link>
              <button onClick={logout} className="text-left text-sm text-red-600 py-1">Log out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login"    className="nav-link py-1" onClick={() => setMobile(false)}>Log in</Link>
              <Link href="/auth/register" className="btn-primary text-center" onClick={() => setMobile(false)}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
