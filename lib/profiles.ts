import { supabase } from './supabase'

export interface UserProfile {
  user_id: string
  display_name: string
  photo_url: string | null
  sub: string
  role: 'qa' | 'company' | 'admin'
  slug?: string
}

// Cache only real names, not defaults
const cache = new Map<string, UserProfile>()

export async function fetchProfile(uid: string): Promise<UserProfile> {
  const cached = cache.get(uid)
  // Return cache only if we have a real display name
  if (cached && cached.display_name && !['QA Specialist', 'Company', 'Unknown', 'User'].includes(cached.display_name)) {
    return cached
  }

  try {
    // Get role
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', uid)
      .single()

    const role = (prof?.role || 'qa') as 'qa' | 'company' | 'admin'

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
      if (co?.company_name) cache.set(uid, result)
      return result
    }

    // QA or Admin - get from qa_profiles
    const { data: qa } = await supabase
      .from('qa_profiles')
      .select('full_name, photo_url, title, slug')
      .eq('user_id', uid)
      .single()

    // Fallback: get email from auth if no full_name
    let displayName = qa?.full_name || ''
    if (!displayName) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id === uid && user?.email) {
        displayName = user.email.split('@')[0]
      }
    }

    const result: UserProfile = {
      user_id: uid,
      display_name: displayName || 'QA Specialist',
      photo_url: qa?.photo_url || null,
      sub: qa?.title || '',
      role,
      slug: qa?.slug || undefined,
    }

    if (displayName && displayName !== 'QA Specialist') cache.set(uid, result)
    return result

  } catch {
    return { user_id: uid, display_name: 'User', photo_url: null, sub: '', role: 'qa' }
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
