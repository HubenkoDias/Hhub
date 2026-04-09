import { supabase } from './supabase'

export interface UserProfile {
  user_id: string
  display_name: string
  photo_url: string | null
  sub: string
  role: 'qa' | 'company' | 'admin'
  slug?: string
}

// Session-scoped cache - cleared on page reload naturally
const cache = new Map<string, UserProfile>()

export async function fetchProfile(uid: string): Promise<UserProfile> {
  // Return cached only if we have a real name (not default placeholder)
  const cached = cache.get(uid)
  if (cached && cached.display_name !== 'QA Specialist' && cached.display_name !== 'Company' && cached.display_name !== 'User') {
    return cached
  }

  try {
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', uid)
      .single()

    if (profError || !prof) {
      return { user_id: uid, display_name: 'Unknown', photo_url: null, sub: '', role: 'qa' }
    }

    const role = prof.role as 'qa' | 'company' | 'admin'

    if (role === 'company') {
      const { data: co } = await supabase
        .from('company_profiles')
        .select('company_name, logo_url, industry, slug')
        .eq('user_id', uid)
        .single()

      const result: UserProfile = {
        user_id: uid,
        display_name: co?.company_name || 'Company',
        photo_url: co?.logo_url || null,
        sub: co?.industry || '',
        role: 'company',
        slug: co?.slug || undefined,
      }
      cache.set(uid, result)
      return result
    }

    // QA or Admin
    const { data: qa } = await supabase
      .from('qa_profiles')
      .select('full_name, photo_url, title, slug')
      .eq('user_id', uid)
      .single()

    const result: UserProfile = {
      user_id: uid,
      display_name: qa?.full_name || 'QA Specialist',
      photo_url: qa?.photo_url || null,
      sub: qa?.title || '',
      role,
      slug: qa?.slug || undefined,
    }

    // Only cache if we got a real name
    if (qa?.full_name) cache.set(uid, result)
    return result

  } catch {
    return { user_id: uid, display_name: 'Unknown', photo_url: null, sub: '', role: 'qa' }
  }
}

export function profileLink(p: UserProfile): string {
  const id = p.slug || p.user_id
  return p.role === 'company' ? `/companies/${id}` : `/specialists/${id}`
}

export function clearProfileCache(uid?: string) {
  if (uid) cache.delete(uid)
  else cache.clear()
}
