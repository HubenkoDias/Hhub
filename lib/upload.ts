import { supabase } from './supabase'

const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_FILES  = [
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

export async function uploadImage(
  file: File,
  bucket: string,
  userId: string,
  maxMB = 5
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_IMAGES.includes(file.type))
    return { error: 'Only JPG, PNG, GIF, WebP allowed' }
  if (file.size > maxMB * 1024 * 1024)
    return { error: `Max ${maxMB}MB` }

  const ext  = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (error || !data) return { error: error?.message || 'Upload failed' }

  const { data: u } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return { url: u.publicUrl }
}

export async function uploadChatFile(
  file: File,
  userId: string
): Promise<{ url: string; type: 'image' | 'file'; name: string; size: number } | { error: string }> {
  const isImage = ALLOWED_IMAGES.includes(file.type)
  const isFile  = ALLOWED_FILES.includes(file.type)

  if (!isImage && !isFile)
    return { error: 'File type not allowed. Use JPG/PNG/GIF/WebP or PDF/TXT/DOC' }

  const maxSize = isImage ? 5 * 1024 * 1024 : 2 * 1024 * 1024
  if (file.size > maxSize)
    return { error: `Max ${isImage ? '5' : '2'}MB` }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${Date.now()}-${safeName}`

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(path, file, { cacheControl: '3600' })

  if (error || !data) return { error: error?.message || 'Upload failed' }

  const { data: u } = supabase.storage.from('chat-files').getPublicUrl(data.path)
  return { url: u.publicUrl, type: isImage ? 'image' : 'file', name: file.name, size: file.size }
}
