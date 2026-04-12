import { supabase } from './supabase'

export interface UserProfile {
  user_id: string
  display_name: string
  photo_url: string | null
  sub: string
  role: 'qa' | 'company' | 'admin' | 'deleted'
  slug?: string
  deleted?: boolean
}

const cache = new Map<string, UserProfile>()

export async function fetchProfile(uid: string): Promise<UserProfile> {
  const DELETED: UserProfile = {
    user_id: uid, display_name: 'Deleted User',
    photo_url: null, sub: '', role: 'deleted', deleted: true
  }

  // Return cached only if real name
  const cached = cache.get(uid)
  if (cached && cached.display_name && !['QA Specialist', 'Company', 'Unknown', 'User', 'Deleted User'].includes(cached.display_name)) {
    return cached
  }

  try {
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', uid)
      .single()

    // User deleted or not found
    if (profError || !prof) return DELETED

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
      if (co?.company_name) cache.set(uid, result)
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
    if (qa?.full_name) cache.set(uid, result)
    return result

  } catch {
    return DELETED
  }
}

export function profileLink(p: UserProfile): string {
  if (p.deleted) return '#'
  const id = p.slug || p.user_id
  return p.role === 'company' ? `/companies/${id}` : `/specialists/${id}`
}

export function clearProfileCache(uid?: string) {
  if (uid) cache.delete(uid)
  else cache.clear()
}
