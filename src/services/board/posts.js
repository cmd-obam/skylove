import { supabase } from '@/lib/supabase'
import { isAdminRole } from '@/services/auth/roles'
import { fetchPostMeta } from '@/services/board/postStats'
import { deleteBoardFiles } from '@/services/board/storage'
import { getTempBoardPost, getTempBoardPosts } from '@/data/tempBoardPosts'

const PERMISSION_DENIED = '권한이 없습니다.'

export function mapBoardPostRow(row, meta) {
  const images = Array.isArray(row.images) ? row.images : []

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    writer: row.writer,
    author: row.writer,
    authorName: row.writer,
    createdAt: row.created_at,
    date: row.created_at,
    views: meta?.views_count ?? 0,
    attachments: row.attachment_url
      ? [{ name: row.attachment_name || '첨부파일', url: row.attachment_url }]
      : [],
    images: images.map((image, index) => ({
      src: image.url,
      alt: image.alt || '',
      path: image.path,
      name: image.name || `image-${index + 1}`,
    })),
    thumbnail: row.thumbnail,
    attachmentUrl: row.attachment_url,
    attachmentName: row.attachment_name,
  }
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
    .select('role, name')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error || !isAdminRole(profile?.role)) {
    return { success: false, message: PERMISSION_DENIED }
  }

  return { success: true, profile }
}

async function fetchPostsMetaMap(postType, postIds) {
  if (postIds.length === 0) {
    return {}
  }

  const { data, error } = await supabase
    .from('board_post_meta')
    .select('post_id, views_count, likes_count, comments_count')
    .eq('post_type', postType)
    .in('post_id', postIds.map(String))

  if (error) {
    console.error('[Board] fetchPostsMetaMap failed', error)
    return {}
  }

  return Object.fromEntries((data ?? []).map((row) => [row.post_id, row]))
}

export async function fetchBoardPosts(postType) {
  const { data, error } = await supabase
    .from('board_post_list')
    .select('id, post_type, title, writer, thumbnail, created_at')
    .eq('post_type', postType)
    .order('created_at', { ascending: false })

  if (error) {
    const tempPosts = getTempBoardPosts(postType)

    if (tempPosts.length > 0) {
      return { success: true, posts: tempPosts }
    }

    return { success: false, message: error.message, posts: [] }
  }

  const postIds = (data ?? []).map((row) => row.id)

  const metaMap = await fetchPostsMetaMap(postType, postIds)

  const posts = (data ?? []).map((row, index) => ({
    ...mapBoardPostRow(row, metaMap[String(row.id)]),
    commentsCount: metaMap[String(row.id)]?.comments_count ?? 0,
    no: (data ?? []).length - index,
  }))

  if (posts.length === 0) {
    const tempPosts = getTempBoardPosts(postType)

    if (tempPosts.length > 0) {
      return { success: true, posts: tempPosts }
    }
  }

  return { success: true, posts }
}

export async function fetchBoardPost(postType, postId) {
  const { data, error } = await supabase
    .from('board_posts')
    .select('*')
    .eq('post_type', postType)
    .eq('id', postId)
    .maybeSingle()

  if (error) {
    return { success: false, message: error.message }
  }

  if (!data) {
    const tempPost = getTempBoardPost(postType, postId)

    if (tempPost) {
      return { success: true, post: tempPost, postType }
    }

    return { success: false, notFound: true }
  }

  const metaResult = await fetchPostMeta(postType, postId)

  return {
    success: true,
    post: mapBoardPostRow(data, metaResult.success ? metaResult.stats : null),
    postType,
  }
}

export async function fetchBoardPostById(postId) {
  const { data, error } = await supabase
    .from('board_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle()

  if (error) {
    return { success: false, message: error.message }
  }

  if (!data) {
    for (const postType of ['album', 'church_news']) {
      const tempPost = getTempBoardPost(postType, postId)

      if (tempPost) {
        return { success: true, post: tempPost, postType }
      }
    }

    return { success: false, notFound: true }
  }

  const metaResult = await fetchPostMeta(data.post_type, postId)

  return {
    success: true,
    post: mapBoardPostRow(data, metaResult.success ? metaResult.stats : null),
    postType: data.post_type,
  }
}

export async function fetchRelatedBoardPosts(postType, postId, limit = 5) {
  const result = await fetchBoardPosts(postType)

  if (!result.success) {
    return []
  }

  return result.posts.filter((post) => String(post.id) !== String(postId)).slice(0, limit)
}

async function ensurePostMeta(postType, postId) {
  await supabase.rpc('ensure_board_post_meta', {
    p_post_type: postType,
    p_post_id: String(postId),
  })
}

export async function createBoardPost({
  postType,
  id,
  title,
  content,
  writer,
  attachmentUrl = null,
  attachmentName = null,
  images = [],
  thumbnail = null,
}) {
  const auth = await assertBoardAdmin()

  if (!auth.success) {
    return auth
  }

  const postId = id ?? crypto.randomUUID()

  const { data, error } = await supabase
    .from('board_posts')
    .insert({
      id: postId,
      post_type: postType,
      title,
      content,
      writer,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      images,
      thumbnail,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42501') {
      return { success: false, message: PERMISSION_DENIED }
    }

    return { success: false, message: error.message }
  }

  await ensurePostMeta(postType, postId)

  return {
    success: true,
    post: mapBoardPostRow(data),
  }
}

export async function updateBoardPost(postType, postId, payload) {
  const auth = await assertBoardAdmin()

  if (!auth.success) {
    return auth
  }

  const { data, error } = await supabase
    .from('board_posts')
    .update({
      title: payload.title,
      content: payload.content,
      writer: payload.writer,
      attachment_url: payload.attachmentUrl ?? null,
      attachment_name: payload.attachmentName ?? null,
      images: payload.images ?? [],
      thumbnail: payload.thumbnail ?? null,
    })
    .eq('post_type', postType)
    .eq('id', postId)
    .select()
    .single()

  if (error) {
    if (error.code === '42501') {
      return { success: false, message: PERMISSION_DENIED }
    }

    return { success: false, message: error.message }
  }

  return {
    success: true,
    post: mapBoardPostRow(data),
  }
}

export async function deleteBoardPost(postType, postId) {
  const auth = await assertBoardAdmin()

  if (!auth.success) {
    return auth
  }

  const existing = await fetchBoardPost(postType, postId)

  if (!existing.success) {
    return existing
  }

  const storagePaths = [
  ...(existing.post.images ?? []).map((image) => image.path),
  ]

  const { error } = await supabase
    .from('board_posts')
    .delete()
    .eq('post_type', postType)
    .eq('id', postId)

  if (error) {
    if (error.code === '42501') {
      return { success: false, message: PERMISSION_DENIED }
    }

    return { success: false, message: error.message }
  }

  if (storagePaths.length > 0) {
    await deleteBoardFiles(storagePaths)
  }

  return { success: true }
}
