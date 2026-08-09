import { supabase } from '@/lib/supabase'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { canWritePost } from '@/services/auth/roles'

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

async function assertBoardWriter(postType) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, message: PERMISSION_DENIED }
  }

  const profileResult = await fetchProfileByUserId(session.user.id)

  if (!profileResult.success || !profileResult.profile) {
    return { success: false, message: PERMISSION_DENIED }
  }

  const userId = profileResult.profile.effectiveUserId ?? session.user.id

  if (!canWritePost(profileResult.profile, postType, userId)) {
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

export async function uploadBoardFile(path, file, postType) {
  const auth = await assertBoardWriter(postType)

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

export async function deleteBoardFiles(paths, postType) {
  const auth = await assertBoardWriter(postType)

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
