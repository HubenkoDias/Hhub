'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, X, Bell, User, LogOut, MessageSquare, Heart, Shield, ChevronDown, Settings } from 'lucide-react'

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,       setUser]       = useState<any>(undefined) // undefined = loading
  const [role,       setRole]       = useState<string | null>(null)
  const [mobile,     setMobile]     = useState(false)
  const [userMenu,   setUserMenu]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [msgCount,   setMsgCount]   = useState(0)
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
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id).eq('read', false)
      setNotifCount(count || 0)

      // Count unread messages
      const { data: userConvs } = await supabase.from('conversations')
        .select('id')
        .or(`participant_1.eq.${session.user.id},participant_2.eq.${session.user.id}`)
      if (userConvs && userConvs.length > 0) {
        const convIds = userConvs.map((c: any) => c.id)
        const { count: unread } = await supabase.from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .eq('read', false)
          .neq('sender_id', session.user.id)
        setMsgCount(unread || 0)
      }
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

  const logout = async () => { await supabase.auth.signOut(); setUserMenu(false); window.location.href = '/' }

  const isHome = pathname === '/'
  const solid  = scrolled || !isHome

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
      solid
        ? 'bg-white border-b border-[#E8E6E1]'
        : 'bg-transparent border-b border-white/10'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-14 flex items-center justify-between gap-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
              solid ? 'bg-[#111] text-white' : 'bg-white/15 text-white'
            }`}>HH</div>
            <span className={`font-bold tracking-tight text-base ${solid ? 'text-[#111]' : 'text-white'}`}>
              HHub
            </span>
          </Link>

          {/* ── Nav links ── */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {[
              ['Specialists', '/browse/specialists'],
              ['Companies',   '/browse/companies'],
              ['Insights',    '/insights'],
              ['About',       '/about'],
              ['Team',        '/team'],
            ].map(([label, href]) => {
              const isActive = pathname === href
              return (
                <Link key={href} href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? solid ? 'bg-[#111]/8 text-[#111]' : 'bg-white/15 text-white'
                      : solid ? 'text-[#111]/55 hover:text-[#111] hover:bg-[#111]/5' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}>
                  {label}
                </Link>
              )
            })}
          </div>

          {/* ── Right side ── */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {user === undefined ? (
              // Loading state - prevents flash
              <div className="w-24 h-8 rounded-lg bg-[#111]/6 animate-pulse" />
            ) : user ? (
              // Logged in
              <div className="flex items-center gap-1">
                {/* Messages with unread badge */}
                <Link href="/messages" title="Messages"
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    solid ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8' : 'text-white/60 hover:text-white hover:bg-white/12'
                  }`}>
                  <MessageSquare size={16} />
                  {msgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C8473A] text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                      {msgCount > 9 ? '9+' : msgCount}
                    </span>
                  )}
                </Link>
                {/* Favorites */}
                <Link href="/favorites" title="Saved"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    solid ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8' : 'text-white/60 hover:text-white hover:bg-white/12'
                  }`}>
                  <Heart size={16} />
                </Link>

                {/* Notifications with badge */}
                <Link href="/notifications" title="Notifications"
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    solid
                      ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8'
                      : 'text-white/60 hover:text-white hover:bg-white/12'
                  }`}>
                  <Bell size={16} />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C8473A] text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </Link>

                {/* Divider */}
                <div className={`w-px h-5 mx-1 ${solid ? 'bg-[#111]/10' : 'bg-white/15'}`} />

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setUserMenu(!userMenu)}
                    className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg transition-all duration-150 ${
                      solid
                        ? 'text-[#111]/70 hover:text-[#111] hover:bg-[#111]/8'
                        : 'text-white/70 hover:text-white hover:bg-white/12'
                    } ${userMenu ? (solid ? 'bg-[#111]/8' : 'bg-white/12') : ''}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${solid ? 'bg-[#111]' : 'bg-white/20'}`}>
                      <User size={12} className="text-white" />
                    </div>
                    <ChevronDown size={12} className={`transition-transform duration-150 ${userMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-11 w-52 bg-white border border-[#E8E6E1] rounded-xl shadow-xl overflow-hidden animate-fade-in">
                      <div className="px-3 py-2.5 border-b border-[#F0EDE8]">
                        <p className="text-xs text-[#111]/40 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { label: 'My Profile',    href: '/dashboard',     icon: User },
                          { label: 'Messages',      href: '/messages',      icon: MessageSquare },
                          { label: 'Saved',         href: '/favorites',     icon: Heart },
                          { label: 'Notifications', href: '/notifications', icon: Bell, badge: notifCount },
                          { label: 'Settings',      href: '/dashboard#settings', icon: Settings },
                        ].map(({ label, href, icon: Icon, badge }) => (
                          <Link key={href} href={href} onClick={() => setUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#111]/70 hover:text-[#111] hover:bg-[#F5F4F1] transition-colors">
                            <Icon size={14} className="text-[#111]/40 flex-shrink-0" />
                            {label}
                            {badge && badge > 0 ? (
                              <span className="ml-auto bg-[#C8473A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                            ) : null}
                          </Link>
                        ))}
                        {role === 'admin' && (
                          <>
                            <div className="h-px bg-[#F0EDE8] my-1" />
                            <Link href="/admin" onClick={() => setUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#C8473A] hover:bg-red-50 transition-colors font-medium">
                              <Shield size={14} className="flex-shrink-0" /> Admin Panel
                            </Link>
                          </>
                        )}
                        <div className="h-px bg-[#F0EDE8] my-1" />
                        <button onClick={logout}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                          <LogOut size={14} className="flex-shrink-0" /> Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Not logged in
              <div className="flex items-center gap-2">
                <Link href="/auth/login"
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-150 ${
                    solid ? 'text-[#111]/60 hover:text-[#111] hover:bg-[#111]/6' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}>
                  Log in
                </Link>
                <Link href="/auth/register"
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#C8473A] text-white hover:bg-[#B33D31] transition-colors">
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2 rounded-lg hover:bg-[#111]/6 transition-colors"
            onClick={() => setMobile(!mobile)}>
            {mobile
              ? <X size={18} className={solid ? 'text-[#111]' : 'text-white'} />
              : <Menu size={18} className={solid ? 'text-[#111]' : 'text-white'} />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobile && (
        <div className="md:hidden bg-white border-t border-[#E8E6E1] animate-fade-in">
          <div className="px-4 py-3 space-y-0.5">
            {[['Specialists','/browse/specialists'],['Companies','/browse/companies'],['Insights','/insights'],['About','/about'],['Team','/team']].map(([l, h]) => (
              <Link key={h} href={h} onClick={() => setMobile(false)}
                className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg transition-colors">
                {l}
              </Link>
            ))}
          </div>
          <div className="border-t border-[#F0EDE8] px-4 py-3 space-y-0.5">
            {!user ? (
              <>
                <Link href="/auth/login" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg transition-colors">Log in</Link>
                <Link href="/auth/register" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-semibold text-white bg-[#C8473A] hover:bg-[#B33D31] rounded-lg transition-colors text-center mt-2">Get started</Link>
              </>
            ) : (
              <>
                {[['My Profile','/dashboard'],['Messages','/messages'],['Notifications','/notifications'],['Saved','/favorites']].map(([l, h]) => (
                  <Link key={h} href={h} onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg transition-colors">{l}</Link>
                ))}
                {role === 'admin' && <Link href="/admin" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#C8473A] hover:bg-red-50 rounded-lg transition-colors">Admin Panel</Link>}
                <button onClick={logout} className="w-full text-left block px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Log out</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
