'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, X, Bell, User, LogOut, MessageSquare, Heart, Shield, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,       setUser]       = useState<any>(undefined)
  const [role,       setRole]       = useState<string|null>(null)
  const [mobile,     setMobile]     = useState(false)
  const [userMenu,   setUserMenu]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [scrolled,   setScrolled]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    onScroll()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setUser(null); return }
      setUser(session.user)
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
      if (p) setRole(p.role)
      const { count } = await supabase.from('notifications')
        .select('*', { count:'exact', head:true })
        .eq('user_id', session.user.id).eq('read', false)
      setNotifCount(count || 0)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session) { setRole(null); setNotifCount(0) }
    })

    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => { sub.subscription.unsubscribe(); window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClick) }
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); setUserMenu(false) }

  const isHome = pathname === '/'
  const solid  = scrolled || !isHome

  const navCls = solid
    ? 'bg-white/95 backdrop-blur-md border-b border-[#E8E6E1] shadow-sm'
    : 'bg-transparent border-b border-white/10'

  const logoColor  = solid ? 'text-[#111]' : 'text-white'
  const linkColor  = solid ? 'text-[#111]/55 hover:text-[#111]' : 'text-white/70 hover:text-white'
  const iconBg     = solid ? 'hover:bg-[#111]/6' : 'hover:bg-white/10'
  const iconColor  = solid ? 'text-[#111]/55' : 'text-white/70'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${navCls}`}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold font-mono ${solid ? 'bg-[#111] text-white' : 'bg-white/15 text-white'}`}>HH</div>
          <span className={`text-base font-bold tracking-tight ${logoColor}`}>HHub</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 flex-1">
          {[['Specialists','/browse/specialists'],['Companies','/browse/companies'],['Insights','/insights'],['About','/about'],['Team','/team']].map(([l,h]) => (
            <Link key={h} href={h} className={`text-sm font-medium transition-colors duration-150 ${linkColor}`}>{l}</Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0" style={{ minWidth: 160 }}>
          {user === undefined ? (
            <div className="w-8 h-8 rounded-lg bg-[#111]/6 animate-pulse"/>
          ) : user ? (
            <div className="flex items-center gap-1">
              <Link href="/messages" className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconBg}`} title="Messages">
                <MessageSquare size={15} className={iconColor}/>
              </Link>
              <Link href="/favorites" className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconBg}`} title="Saved">
                <Heart size={15} className={iconColor}/>
              </Link>
              <Link href="/notifications" className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${iconBg}`}>
                <Bell size={15} className={iconColor}/>
                {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-[#C8473A] text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
              </Link>
              <div className="relative ml-1" ref={menuRef}>
                <button onClick={() => setUserMenu(!userMenu)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${iconBg}`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${solid ? 'bg-[#111]' : 'bg-white/15'}`}>
                    <User size={12} className="text-white"/>
                  </div>
                  <ChevronDown size={12} className={`${iconColor} transition-transform duration-150 ${userMenu ? 'rotate-180' : ''}`}/>
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-11 bg-white border border-[#E8E6E1] rounded-xl shadow-xl py-1.5 w-44 animate-fade-in">
                    {[
                      { label:'My Profile',     href:'/dashboard',     icon:User },
                      { label:'Messages',       href:'/messages',      icon:MessageSquare },
                      { label:'Saved',          href:'/favorites',     icon:Heart },
                      { label:'Notifications',  href:'/notifications', icon:Bell },
                    ].map(({ label, href, icon:Icon }) => (
                      <Link key={href} href={href} onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#F5F4F1] transition-colors">
                        <Icon size={13} className="text-[#111]/40"/> {label}
                        {label === 'Notifications' && notifCount > 0 && <span className="ml-auto bg-[#C8473A] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{notifCount}</span>}
                      </Link>
                    ))}
                    {role === 'admin' && (
                      <><div className="h-px bg-[#E8E6E1] my-1"/>
                      <Link href="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#C8473A] hover:bg-red-50 transition-colors">
                        <Shield size={13}/> Admin Panel
                      </Link></>
                    )}
                    <div className="h-px bg-[#E8E6E1] my-1"/>
                    <button onClick={logout} className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                      <LogOut size={13}/> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className={`text-sm font-medium transition-colors ${linkColor} px-3 py-2`}>Log in</Link>
              <Link href="/auth/register" className="btn-accent text-sm px-4 py-2">Get started</Link>
            </div>
          )}
        </div>

        <button className="md:hidden p-1.5 rounded-lg hover:bg-[#111]/6 transition-colors" onClick={() => setMobile(!mobile)}>
          {mobile ? <X size={18} className={solid ? 'text-[#111]' : 'text-white'}/> : <Menu size={18} className={solid ? 'text-[#111]' : 'text-white'}/>}
        </button>
      </div>

      {mobile && (
        <div className="md:hidden bg-white border-t border-[#E8E6E1] px-6 py-3 flex flex-col gap-0.5 animate-fade-in">
          {[['Specialists','/browse/specialists'],['Companies','/browse/companies'],['Insights','/insights'],['About','/about'],['Team','/team']].map(([l,h]) => (
            <Link key={h} href={h} className="py-2 text-sm font-medium text-[#111]/65 hover:text-[#111]" onClick={() => setMobile(false)}>{l}</Link>
          ))}
          <div className="h-px bg-[#E8E6E1] my-2"/>
          {user ? (
            <>
              {[['My Profile','/dashboard'],['Messages','/messages'],['Notifications','/notifications'],['Saved','/favorites']].map(([l,h]) => (
                <Link key={h} href={h} className="py-2 text-sm font-medium text-[#111]/65 hover:text-[#111]" onClick={() => setMobile(false)}>{l}</Link>
              ))}
              {role==='admin' && <Link href="/admin" className="py-2 text-sm font-medium text-[#C8473A]" onClick={() => setMobile(false)}>Admin Panel</Link>}
              <button onClick={logout} className="py-2 text-sm font-medium text-red-600 text-left">Log out</button>
            </>
          ) : (
            <>
              <Link href="/auth/login"    className="py-2 text-sm font-medium" onClick={() => setMobile(false)}>Log in</Link>
              <Link href="/auth/register" className="btn-accent mt-2 text-center" onClick={() => setMobile(false)}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
