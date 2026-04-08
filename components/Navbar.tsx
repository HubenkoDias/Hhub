'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, X, Bell, User, LogOut, ChevronDown, Settings, Shield, Heart } from 'lucide-react'

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,       setUser]       = useState<any>(null)
  const [role,       setRole]       = useState<string|null>(null)
  const [mobile,     setMobile]     = useState(false)
  const [userMenu,   setUserMenu]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled,   setScrolled]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUser(data.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
      if (p) setRole(p.role)
      // Count unread notifications
      const { count } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.user.id).eq('read', false)
      setNotifCount(count || 0)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session) { setRole(null); setNotifCount(0) }
    })

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); setUserMenu(false) }

  const isHome = pathname === '/'
  const navBg  = scrolled || !isHome
    ? 'bg-[#EAE7E0]/95 backdrop-blur-md border-b border-[#D8D4CB] shadow-sm'
    : 'bg-transparent'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0F0F0F] rounded-lg flex items-center justify-center">
            <span className="text-white font-mono font-bold text-xs">HH</span>
          </div>
          <span style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold text-[#0F0F0F]">HHub</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/browse/specialists" className="nav-link">Specialists</Link>
          <Link href="/browse/companies"   className="nav-link">Companies</Link>
          <Link href="/insights"           className="nav-link">Insights</Link>
          <Link href="/about"              className="nav-link">About</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/favorites" className="w-9 h-9 rounded-xl bg-[#0F0F0F]/8 hover:bg-[#0F0F0F]/15 flex items-center justify-center transition-colors" title="Saved">
                <Heart size={16} className="text-[#0F0F0F]/70"/>
              </Link>
              <Link href="/notifications" className="relative w-9 h-9 rounded-xl bg-[#0F0F0F]/8 hover:bg-[#0F0F0F]/15 flex items-center justify-center transition-colors">
                <Bell size={16} className="text-[#0F0F0F]/70"/>
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#C8473A] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>
                )}
              </Link>

              <div className="relative" ref={menuRef}>
                <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl bg-[#0F0F0F]/8 hover:bg-[#0F0F0F]/15 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-[#0F0F0F] flex items-center justify-center">
                    <User size={13} className="text-white"/>
                  </div>
                  <ChevronDown size={13} className={`text-[#0F0F0F]/60 transition-transform duration-200 ${userMenu ? 'rotate-180' : ''}`}/>
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-12 bg-white border border-[#E8E4DC] rounded-2xl shadow-xl py-2 w-48 animate-fade-in">
                    <Link href="/dashboard" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors">
                      <User size={14} className="text-[#0F0F0F]/50"/> My Profile
                    </Link>
                    <Link href="/favorites" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors">
                      <Heart size={14} className="text-[#0F0F0F]/50"/> Saved
                    </Link>
                    <Link href="/notifications" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors">
                      <Bell size={14} className="text-[#0F0F0F]/50"/> Notifications {notifCount > 0 && <span className="ml-auto bg-[#C8473A] text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifCount}</span>}
                    </Link>
                    {role === 'admin' && (
                      <>
                        <hr className="my-1 border-[#E8E4DC]"/>
                        <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#EAE7E0] transition-colors text-[#C8473A]">
                          <Shield size={14}/> Admin Panel
                        </Link>
                      </>
                    )}
                    <hr className="my-1 border-[#E8E4DC]"/>
                    <button onClick={logout} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                      <LogOut size={14}/> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login"    className="nav-link">Log in</Link>
              <Link href="/auth/register" className="btn-primary text-sm px-5 py-2.5">Get started</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2 rounded-xl hover:bg-[#0F0F0F]/8 transition-colors" onClick={() => setMobile(!mobile)}>
          {mobile ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {mobile && (
        <div className="md:hidden bg-[#EAE7E0] border-t border-[#D8D4CB] px-6 py-4 flex flex-col gap-1 animate-fade-in">
          {[['Specialists','/browse/specialists'],['Companies','/browse/companies'],['Insights','/insights'],['About','/about']].map(([l,h]) => (
            <Link key={h} href={h} className="py-2.5 text-sm font-medium text-[#0F0F0F]/70 hover:text-[#0F0F0F]" onClick={() => setMobile(false)}>{l}</Link>
          ))}
          <hr className="border-[#D8D4CB] my-2"/>
          {user ? (
            <>
              <Link href="/dashboard"     className="py-2.5 text-sm font-medium" onClick={() => setMobile(false)}>My Profile</Link>
              <Link href="/notifications" className="py-2.5 text-sm font-medium" onClick={() => setMobile(false)}>Notifications {notifCount>0 && `(${notifCount})`}</Link>
              <Link href="/favorites"     className="py-2.5 text-sm font-medium" onClick={() => setMobile(false)}>Saved</Link>
              {role==='admin' && <Link href="/admin" className="py-2.5 text-sm font-medium text-[#C8473A]" onClick={() => setMobile(false)}>Admin Panel</Link>}
              <button onClick={logout} className="py-2.5 text-sm font-medium text-red-600 text-left">Log out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login"    className="py-2.5 text-sm font-medium" onClick={() => setMobile(false)}>Log in</Link>
              <Link href="/auth/register" className="btn-primary mt-2 text-center" onClick={() => setMobile(false)}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
