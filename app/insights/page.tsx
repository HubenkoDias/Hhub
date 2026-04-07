'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

const CAT_COLORS: Record<string,string> = {
  'article':'bg-blue-50 text-blue-700',
  'guide':'bg-purple-50 text-purple-700',
  'interview':'bg-amber-50 text-amber-700',
  'case-study':'bg-emerald-50 text-emerald-700',
}

export default function Insights() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('blog_posts').select('*').eq('published',true).order('created_at',{ascending:false})
      .then(({ data }) => { setPosts(data||[]); setLoading(false) })
  }, [])

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="bg-[#0F0F0F] py-16">
          <div className="max-w-7xl mx-auto px-6">
            <p className="section-tag text-white/40 mb-3">Latest from the QA Community</p>
            <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold text-white">QA insights.<br/>Real-world expertise.</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
          ) : posts.length===0 ? (
            <div className="text-center py-20 text-[#0F0F0F]/40"><p className="font-mono text-sm">No posts yet. Check back soon.</p></div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {posts.map(p => (
                <Link key={p.id} href={`/insights/${p.slug}`} className="card-hover group block">
                  <div className="aspect-[4/3] bg-black/10 rounded-xl mb-4 overflow-hidden">
                    {p.cover_image_url
                      ? <img src={p.cover_image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={p.title}/>
                      : <div className="w-full h-full flex items-center justify-center"><span className="font-mono text-xs text-[#0F0F0F]/20">[Cover]</span></div>
                    }
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full capitalize ${CAT_COLORS[p.category]||'bg-black/10 text-[#0F0F0F]/60'}`}>
                    {p.category.replace('-',' ')}
                  </span>
                  <h3 style={{ fontFamily:'var(--font-display)' }} className="text-lg font-bold mt-3 mb-2 group-hover:text-[#C8473A] transition-colors leading-snug">{p.title}</h3>
                  <p className="text-sm text-[#0F0F0F]/60 leading-relaxed line-clamp-3">{p.excerpt}</p>
                  <p className="text-xs text-[#0F0F0F]/30 mt-3 font-mono">{new Date(p.created_at).toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'})}</p>
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
