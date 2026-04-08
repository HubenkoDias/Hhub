'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function BlogPost() {
  const { slug } = useParams() as { slug: string }
  const [post,    setPost]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('blog_posts').select('*').eq('slug', slug).eq('published', true).single()
      .then(({ data }) => { setPost(data); setLoading(false) })
  }, [slug])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0F0F0F]/20 border-t-[#0F0F0F] rounded-full animate-spin"/></div>
  if (!post)   return <><Navbar/><div className="min-h-screen pt-24 flex items-center justify-center"><h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold">Post not found</h1></div></>

  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <Link href="/insights" className="flex items-center gap-2 text-sm text-[#0F0F0F]/50 hover:text-[#0F0F0F] transition-colors mb-8">
            <ArrowLeft size={16}/> Back to Insights
          </Link>
          <span className="text-xs font-mono bg-black/10 px-2.5 py-1 rounded-full capitalize">{post.category.replace('-',' ')}</span>
          <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl md:text-5xl font-bold mt-4 mb-4 leading-tight">{post.title}</h1>
          <div className="flex items-center gap-2 text-xs text-[#0F0F0F]/40 font-mono mb-8">
            <Calendar size={12}/>{new Date(post.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}
          </div>
          {post.cover_image_url && <img src={post.cover_image_url} className="w-full rounded-2xl mb-10 border border-[#D8D4CB]" alt={post.title}/>}
          {post.excerpt && <p className="text-lg text-[#0F0F0F]/70 leading-relaxed mb-8 font-medium border-l-2 border-[#C8473A] pl-5">{post.excerpt}</p>}
          <div className="text-[#0F0F0F]/80 leading-relaxed whitespace-pre-wrap text-[15px]">{post.content}</div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
