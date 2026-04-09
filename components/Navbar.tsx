'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Menu, X, Bell, LogOut, MessageSquare, Heart, Shield, ChevronDown, Settings, User } from 'lucide-react'

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()

  const [user,       setUser]       = useState<any>(undefined) // undefined = loading
  const [role,       setRole]       = useState<string | null>(null)
  const [photoUrl,   setPhotoUrl]   = useState<string | null>(null)
  const [mobile,     setMobile]     = useState(false)
  const [userMenu,   setUserMenu]   = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [msgCount,   setMsgCount]   = useState(0)
  const [scrolled,   setScrolled]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  const fetchCounts = async (uid: string) => {
    // Unread notifications
    const { count: nc } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid).eq('read', false)
    setNotifCount(nc || 0)

    // Unread messages — count messages in user's conversations that are unread
    const { data: convs } = await supabase.from('conversations')
      .select('id')
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
    if (convs && convs.length > 0) {
      const ids = convs.map((c: any) => c.id)
      const { count: mc } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .eq('read', false)
        .neq('sender_id', uid)
      setMsgCount(mc || 0)
    } else {
      setMsgCount(0)
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    onScroll()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setUser(null); return }
      const u = session.user
      setUser(u)

      // Get role + photo
      const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', u.id).single()
      if (prof) setRole(prof.role)

      // Fetch photo based on role
      if (prof?.role === 'qa' || prof?.role === 'admin') {
        const { data: qa } = await supabase.from('qa_profiles').select('photo_url').eq('user_id', u.id).single()
        if (qa?.photo_url) setPhotoUrl(qa.photo_url)
      } else if (prof?.role === 'company') {
        const { data: co } = await supabase.from('company_profiles').select('logo_url').eq('user_id', u.id).single()
        if (co?.logo_url) setPhotoUrl(co.logo_url)
      }

      await fetchCounts(u.id)

      // Realtime: listen for new messages to update badge live
      const ch = supabase.channel('navbar-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          async () => { await fetchCounts(u.id) }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages',
          filter: `read=eq.true` },
          async () => { await fetchCounts(u.id) }
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
          async () => { await fetchCounts(u.id) }
        )
        .subscribe()
      channelRef.current = ch
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setRole(null); setNotifCount(0); setMsgCount(0); setPhotoUrl(null)
        if (channelRef.current) supabase.removeChannel(channelRef.current)
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)

    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', handleClick)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  // Refresh counts when navigating back to page
  useEffect(() => {
    if (user && user !== undefined) {
      fetchCounts(user.id)
    }
  }, [pathname])

  const logout = async () => {
    await supabase.auth.signOut()
    setUserMenu(false)
    window.location.href = '/'
  }

  const isHome = pathname === '/'
  const solid  = scrolled || !isHome
  const navBg  = solid ? 'bg-white/95 backdrop-blur-md border-b border-[#E8E6E1] shadow-sm' : 'bg-transparent border-b border-white/10'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-14 flex items-center justify-between gap-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${solid ? 'bg-[#111] text-white' : 'bg-white/15 text-white'}`}>HH</div>
            <span className={`font-bold tracking-tight text-base ${solid ? 'text-[#111]' : 'text-white'}`}>HHub</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {[['Specialists', '/browse/specialists'], ['Companies', '/browse/companies'], ['Jobs', '/jobs'], ['Insights', '/insights'], ['About', '/about'], ['Team', '/team']].map(([label, href]) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                    active
                      ? solid ? 'bg-[#111]/8 text-[#111]' : 'bg-white/15 text-white'
                      : solid ? 'text-[#111]/55 hover:text-[#111] hover:bg-[#111]/5' : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}>
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            {user === undefined ? (
              <div className="w-8 h-8 rounded-lg bg-[#111]/6 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-1">
                {/* Messages with unread badge */}
                <Link href="/messages" title="Messages"
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${solid ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8' : 'text-white/60 hover:text-white hover:bg-white/12'}`}>
                  <MessageSquare size={16} />
                  {msgCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C8473A] text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                      {msgCount > 9 ? '9+' : msgCount}
                    </span>
                  )}
                </Link>

                {/* Favorites */}
                <Link href="/favorites" title="Saved"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${solid ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8' : 'text-white/60 hover:text-white hover:bg-white/12'}`}>
                  <Heart size={16} />
                </Link>

                {/* Notifications */}
                <Link href="/notifications" title="Notifications"
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${solid ? 'text-[#111]/50 hover:text-[#111] hover:bg-[#111]/8' : 'text-white/60 hover:text-white hover:bg-white/12'}`}>
                  <Bell size={16} />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#C8473A] text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center leading-none">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </Link>

                <div className="w-px h-5 mx-1 bg-[#111]/10" />

                {/* User menu */}
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setUserMenu(!userMenu)}
                    className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg transition-all ${solid ? 'hover:bg-[#111]/8' : 'hover:bg-white/12'} ${userMenu ? (solid ? 'bg-[#111]/8' : 'bg-white/12') : ''}`}>
                    {/* Avatar with photo */}
                    <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#111]">
                      {photoUrl
                        ? <img src={photoUrl} className="w-full h-full object-cover" alt="profile" />
                        : <User size={12} className="text-white" />
                      }
                    </div>
                    <ChevronDown size={12} className={`${solid ? 'text-[#111]/50' : 'text-white/50'} transition-transform duration-150 ${userMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-11 w-52 bg-white border border-[#E8E6E1] rounded-xl shadow-xl overflow-hidden animate-fade-in">
                      <div className="px-3 py-2.5 border-b border-[#F0EDE8] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#111]">
                          {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" alt="" /> : <User size={13} className="text-white" />}
                        </div>
                        <p className="text-xs text-[#111]/50 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { label: 'My Profile',    href: '/dashboard',          icon: User },
                          { label: 'Messages',      href: '/messages',           icon: MessageSquare },
                          { label: 'Saved',         href: '/favorites',          icon: Heart },
                          { label: 'Notifications', href: '/notifications',      icon: Bell, badge: notifCount },
                          { label: 'Settings',      href: '/dashboard#settings', icon: Settings },
                        ].map(({ label, href, icon: Icon, badge }) => (
                          <Link key={href} href={href} onClick={() => setUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#111]/70 hover:text-[#111] hover:bg-[#F5F4F1] transition-colors">
                            <Icon size={14} className="text-[#111]/40 flex-shrink-0" />
                            {label}
                            {badge && badge > 0 ? <span className="ml-auto bg-[#C8473A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span> : null}
                          </Link>
                        ))}
                        {role === 'admin' && (
                          <>
                            <div className="h-px bg-[#F0EDE8] my-1" />
                            <Link href="/admin" onClick={() => setUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#C8473A] hover:bg-red-50 transition-colors font-medium">
                              <Shield size={14} /> Admin Panel
                            </Link>
                          </>
                        )}
                        <div className="h-px bg-[#F0EDE8] my-1" />
                        <button onClick={logout} className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                          <LogOut size={14} /> Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className={`text-sm font-medium px-3 py-2 rounded-lg transition-all ${solid ? 'text-[#111]/60 hover:text-[#111] hover:bg-[#111]/6' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  Log in
                </Link>
                <Link href="/auth/register" className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#C8473A] text-white hover:bg-[#B33D31] transition-colors">
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-1.5 rounded-lg hover:bg-[#111]/6 transition-colors" onClick={() => setMobile(!mobile)}>
            {mobile ? <X size={18} className={solid ? 'text-[#111]' : 'text-white'} /> : <Menu size={18} className={solid ? 'text-[#111]' : 'text-white'} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobile && (
        <div className="md:hidden bg-white border-t border-[#E8E6E1] animate-fade-in">
          <div className="px-4 py-3 space-y-0.5">
            {[['Specialists', '/browse/specialists'], ['Companies', '/browse/companies'], ['Jobs', '/jobs'], ['Insights', '/insights'], ['About', '/about'], ['Team', '/team']].map(([l, h]) => (
              <Link key={h} href={h} onClick={() => setMobile(false)}
                className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg transition-colors">{l}</Link>
            ))}
          </div>
          <div className="border-t border-[#F0EDE8] px-4 py-3 space-y-0.5">
            {!user ? (
              <>
                <Link href="/auth/login" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg">Log in</Link>
                <Link href="/auth/register" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-semibold text-white bg-[#C8473A] hover:bg-[#B33D31] rounded-lg text-center mt-2">Get started</Link>
              </>
            ) : (
              <>
                {[['My Profile', '/dashboard'], ['Messages', '/messages'], ['Notifications', '/notifications'], ['Saved', '/favorites']].map(([l, h]) => (
                  <Link key={h} href={h} onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#111]/65 hover:text-[#111] hover:bg-[#F5F4F1] rounded-lg">{l}</Link>
                ))}
                {role === 'admin' && <Link href="/admin" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm font-medium text-[#C8473A] hover:bg-red-50 rounded-lg">Admin Panel</Link>}
                <button onClick={logout} className="w-full text-left block px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">Log out</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
