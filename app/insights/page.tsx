'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

const CATS = [
  { value: '',           label: 'All' },
  { value: 'article',   label: 'Articles' },
  { value: 'guide',     label: 'Guides' },
  { value: 'interview', label: 'Interviews' },
  { value: 'case-study',label: 'Case Studies' },
]

const CAT_COLORS: Record<string, string> = {
  'article':    'bg-blue-50 text-blue-700',
  'guide':      'bg-purple-50 text-purple-700',
  'interview':  'bg-amber-50 text-amber-700',
  'case-study': 'bg-emerald-50 text-emerald-700',
}

export default function Insights() {
  const [posts,   setPosts]   = useState<any[]>([])
  const [all,     setAll]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cat,     setCat]     = useState('')

  useEffect(() => {
    supabase.from('blog_posts').select('*').eq('published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setAll(data || []); setPosts(data || []); setLoading(false) })
  }, [])

  useEffect(() => {
    setPosts(cat ? all.filter(p => p.category === cat) : all)
  }, [cat, all])

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0A0A0A] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-white/35 mb-3">Latest from the QA Community</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white">QA insights.<br/>Real-world expertise.</h1>
          </div>
        </div>

        {/* Category filter */}
        <div className="border-b border-[#D8D4CB] bg-white sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1 overflow-x-auto py-3">
              {CATS.map(c => (
                <button key={c.value} onClick={() => setCat(c.value)}
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${cat === c.value ? 'bg-[#0F0F0F] text-white' : 'text-[#0F0F0F]/55 hover:text-[#0F0F0F] hover:bg-[#EAE7E0]'}`}>
                  {c.label}
                  {c.value === '' && <span className="ml-1.5 text-xs opacity-50">({all.length})</span>}
                  {c.value !== '' && <span className="ml-1.5 text-xs opacity-50">({all.filter(p => p.category === c.value).length})</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-[#0F0F0F]/40">
              <p className="font-mono text-sm">No posts in this category yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {posts.map(p => (
                <Link key={p.id} href={`/insights/${p.slug}`} className="card-hover group block">
                  <div className="aspect-[4/3] bg-[#EAE7E0] rounded-xl mb-4 overflow-hidden">
                    {p.cover_image_url
                      ? <img src={p.cover_image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={p.title}/>
                      : <div className="w-full h-full flex items-center justify-center"><span className="font-mono text-xs text-[#0F0F0F]/20">[Cover]</span></div>
                    }
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full capitalize ${CAT_COLORS[p.category] || 'bg-[#EAE7E0] text-[#0F0F0F]/55'}`}>
                    {p.category.replace('-', ' ')}
                  </span>
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold mt-3 mb-2 group-hover:text-[#C8473A] transition-colors leading-snug">{p.title}</h3>
                  <p className="text-sm text-[#0F0F0F]/55 leading-relaxed line-clamp-3">{p.excerpt}</p>
                  <p className="text-xs text-[#0F0F0F]/30 mt-3 font-mono">
                    {new Date(p.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer/>
    </>
  )
}
