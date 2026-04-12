'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Bell, CheckCheck, MessageSquare, UserCheck, Star, Heart } from 'lucide-react'

const ICONS: Record<string, any> = {
  connection_request: MessageSquare,
  connection_accepted: UserCheck,
  new_message: MessageSquare,
  review: Star,
  verification: UserCheck,
}

export default function Notifications() {
  const router = useRouter()
  const [notifs,  setNotifs]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/login'); return }
      const { data: ns } = await supabase.from('notifications')
        .select('*').eq('user_id', data.user.id)
        .order('created_at', { ascending: false }).limit(50)
      setNotifs(ns || [])
      // Mark all as read
      await supabase.from('notifications').update({ read: true }).eq('user_id', data.user.id).eq('read', false)
      setLoading(false)
    })
  }, [])

  const fmtTime = (ts: string) => {
    const d = new Date(ts), now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60)   return 'just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
    return `${Math.floor(diff/86400)}d ago`
  }

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-3xl font-bold">Notifications</h1>
            <Bell size={20} className="text-[#0F0F0F]/40"/>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : notifs.length === 0 ? (
            <div className="card text-center py-16">
              <Bell size={32} className="text-[#0F0F0F]/20 mx-auto mb-3"/>
              <p className="font-mono text-sm text-[#0F0F0F]/40">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifs.map(n => {
                const Icon = ICONS[n.type] || Bell
                return (
                  <Link key={n.id} href={n.link || '#'} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.read ? 'bg-white border-[#E8E4DC]' : 'bg-white border-[#0F0F0F]/20 shadow-sm'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-[#EAE7E0]' : 'bg-[#0F0F0F]'}`}>
                      <Icon size={18} className={n.read ? 'text-[#0F0F0F]/40' : 'text-white'}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.read ? 'text-[#0F0F0F]/70' : 'text-[#0F0F0F]'}`}>{n.title}</p>
                      <p className="text-xs text-[#0F0F0F]/45 mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-xs text-[#0F0F0F]/30 font-mono flex-shrink-0">{fmtTime(n.created_at)}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
