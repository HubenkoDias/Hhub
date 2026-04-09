import { supabase } from './supabase'

export interface UserProfile {
  user_id: string
  display_name: string
  photo_url: string | null
  sub: string
  role: 'qa' | 'company' | 'admin'
  slug?: string
}

// Cache to avoid repeated fetches for same user in one session
const profileCache = new Map<string, UserProfile>()

export async function fetchProfile(uid: string): Promise<UserProfile> {
  if (profileCache.has(uid)) return profileCache.get(uid)!

  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', uid)
    .single()

  const role = (prof?.role as 'qa' | 'company' | 'admin') || 'qa'

  let result: UserProfile

  if (role === 'company') {
    const { data: co } = await supabase
      .from('company_profiles')
      .select('company_name, logo_url, industry, slug')
      .eq('user_id', uid)
      .single()

    result = {
      user_id: uid,
      display_name: co?.company_name || 'Company',
      photo_url: co?.logo_url || null,
      sub: co?.industry || '',
      role: 'company',
      slug: co?.slug,
    }
  } else {
    const { data: qa } = await supabase
      .from('qa_profiles')
      .select('full_name, photo_url, title, slug')
      .eq('user_id', uid)
      .single()

    result = {
      user_id: uid,
      display_name: qa?.full_name || 'QA Specialist',
      photo_url: qa?.photo_url || null,
      sub: qa?.title || '',
      role,
      slug: qa?.slug,
    }
  }

  profileCache.set(uid, result)
  return result
}

export function profileLink(p: UserProfile): string {
  const id = p.slug || p.user_id
  return p.role === 'company' ? `/companies/${id}` : `/specialists/${id}`
}

export function clearProfileCache(uid: string) {
  profileCache.delete(uid)
}
