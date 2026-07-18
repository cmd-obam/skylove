import { supabase } from '@/lib/supabase'
import { isAdminRole } from '@/services/auth/roles'

const BUCKET = 'board-uploads'
const PERMISSION_DENIED = '권한이 없습니다.'

export const BOARD_STORAGE_KINDS = {
  image: 'board-images',
  thumbnail: 'board-thumbnails',
  file: 'board-files',
}

export function getBoardFilePublicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function assertBoardAdmin() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, message: PERMISSION_DENIED }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error || !isAdminRole(profile?.role)) {
    return { success: false, message: PERMISSION_DENIED }
  }

  return { success: true }
}

function sanitizeFileName(name) {
  return name.replace(/[^\w.\-가-힣]/g, '_')
}

/**
 * @deprecated Prefer buildBoardCmsStoragePath with kind.
 * Kept for legacy album/church-news path reads.
 */
export function buildBoardStoragePath(postType, postId, fileName) {
  const safeName = sanitizeFileName(fileName)
  const folder = postType === 'album' ? 'album' : 'church-news'
  return `${folder}/${postId}/${Date.now()}-${safeName}`
}

export function buildBoardCmsStoragePath(kind, postType, postId, fileName) {
  const prefix = BOARD_STORAGE_KINDS[kind] || BOARD_STORAGE_KINDS.file
  const safeType = sanitizeFileName(postType || 'board')
  const safeName = sanitizeFileName(fileName)
  return `${prefix}/${safeType}/${postId}/${Date.now()}-${safeName}`
}

export async function uploadBoardFile(path, file) {
  const auth = await assertBoardAdmin()

  if (!auth.success) {
    return auth
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) {
    if (error.message?.includes('policy') || error.message?.includes('Permission')) {
      return { success: false, message: PERMISSION_DENIED }
    }

    return { success: false, message: error.message }
  }

  return {
    success: true,
    path,
    url: getBoardFilePublicUrl(path),
  }
}

export async function deleteBoardFiles(paths) {
  const auth = await assertBoardAdmin()

  if (!auth.success) {
    return auth
  }

  const validPaths = paths.filter(Boolean)

  if (validPaths.length === 0) {
    return { success: true }
  }

  const { error } = await supabase.storage.from(BUCKET).remove(validPaths)

  if (error) {
    if (error.message?.includes('policy') || error.message?.includes('Permission')) {
      return { success: false, message: PERMISSION_DENIED }
    }

    return { success: false, message: error.message }
  }

  return { success: true }
}
