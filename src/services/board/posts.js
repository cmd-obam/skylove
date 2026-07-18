import { supabase } from '@/lib/supabase'
import { isAdminRole } from '@/services/auth/roles'
import { fetchPostMeta } from '@/services/board/postStats'
import { deleteBoardFiles } from '@/services/board/storage'
import { getTempBoardPost, getTempBoardPosts } from '@/data/tempBoardPosts'
import { extractStoragePathFromPublicUrl } from '@/utils/boardContentImages'

const PERMISSION_DENIED = '권한이 없습니다.'

export function mapBoardPostRow(row, meta) {
  const images = Array.isArray(row.images) ? row.images : []
  const attachmentsJson = Array.isArray(row.attachments) ? row.attachments : []

  const attachments =
    attachmentsJson.length > 0
      ? attachmentsJson.map((file, index) => ({
          key: file.path || file.url || `attachment-${index}`,
          name: file.name || `첨부파일-${index + 1}`,
          url: file.url || null,
          path: file.path || null,
          size: file.size ?? null,
          mime: file.mime || null,
        }))
      : row.attachment_url
        ? [
            {
              key: row.attachment_url,
              name: row.attachment_name || '첨부파일',
              url: row.attachment_url,
              path: null,
              size: null,
              mime: null,
            },
          ]
        : []

  const hasImage =
    typeof row.has_image === 'boolean'
      ? row.has_image
      : Boolean(row.thumbnail) || images.length > 0

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    writer: row.writer,
    author: row.writer,
    authorName: row.writer,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    date: row.created_at,
    views: meta?.views_count ?? 0,
    likesCount: meta?.likes_count ?? 0,
    commentsCount: meta?.comments_count ?? 0,
    attachments,
    images: images.map((image, index) => ({
      src: image.url,
      alt: image.alt || '',
      path: image.path,
      name: image.name || `image-${index + 1}`,
    })),
    thumbnail: row.thumbnail,
    hasImage,
    youtubeUrl: row.youtube_url ?? null,
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
    .select('id, post_type, title, writer, thumbnail, created_at, has_image')
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
    for (const postType of ['album', 'church_news', 'sunday_sermon', 'el_shaddai_choir']) {
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

/** postType별 최신 게시글 N건 */
export async function fetchLatestBoardPosts(postType, limit = 4) {
  const safeLimit = Math.max(1, Number(limit) || 4)

  const { data, error } = await supabase
    .from('board_post_list')
    .select('id, post_type, title, writer, thumbnail, created_at, has_image')
    .eq('post_type', postType)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    const tempPosts = getTempBoardPosts(postType).slice(0, safeLimit)

    if (tempPosts.length > 0) {
      return { success: true, posts: tempPosts }
    }

    return { success: false, message: error.message, posts: [] }
  }

  const posts = (data ?? []).map((row) => mapBoardPostRow(row))

  if (posts.length === 0) {
    const tempPosts = getTempBoardPosts(postType).slice(0, safeLimit)

    if (tempPosts.length > 0) {
      return { success: true, posts: tempPosts }
    }
  }

  return { success: true, posts }
}

/**
 * postType별 최신 게시글 1건 (본문·이미지 포함).
 * board_post_list에는 content/images가 없어 board_posts를 조회합니다.
 */
export async function fetchLatestBoardPost(postType) {
  const { data, error } = await supabase
    .from('board_posts')
    .select(
      'id, post_type, title, writer, content, thumbnail, images, youtube_url, created_at, updated_at, attachment_url, attachment_name, has_image, attachments',
    )
    .eq('post_type', postType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    const tempPost = getTempBoardPosts(postType)[0]

    if (tempPost) {
      return { success: true, post: tempPost }
    }

    return { success: false, message: error.message, post: null }
  }

  if (!data) {
    const tempPost = getTempBoardPosts(postType)[0]

    if (tempPost) {
      return { success: true, post: tempPost }
    }

    return { success: true, post: null }
  }

  return { success: true, post: mapBoardPostRow(data) }
}

/** 홈 교회 이야기: 소스별 최신 게시글 병렬 조회 */
export async function fetchHomeStoryPosts(sources) {
  const results = await Promise.all(
    sources.map(async (source) => {
      const result = await fetchLatestBoardPost(source.postType)
      return [source.id, result.success ? result.post : null]
    }),
  )

  return Object.fromEntries(results)
}

/**
 * created_at 내림차순 목록 기준으로 이전(더 최신) / 다음(더 오래된) 게시글.
 */
export async function fetchAdjacentBoardPosts(postType, postId) {
  const result = await fetchBoardPosts(postType)

  if (!result.success) {
    return { prev: null, next: null }
  }

  const index = result.posts.findIndex((post) => String(post.id) === String(postId))

  if (index < 0) {
    return { prev: null, next: null }
  }

  return {
    prev: index > 0 ? result.posts[index - 1] : null,
    next: index < result.posts.length - 1 ? result.posts[index + 1] : null,
  }
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
  attachments = [],
  images = [],
  thumbnail = null,
  hasImage = false,
  youtubeUrl = null,
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
      attachments,
      images,
      thumbnail,
      has_image: hasImage,
      youtube_url: youtubeUrl,
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
      attachments: payload.attachments ?? [],
      images: payload.images ?? [],
      thumbnail: payload.thumbnail ?? null,
      has_image: Boolean(payload.hasImage),
      youtube_url: payload.youtubeUrl ?? null,
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
    ...(existing.post.attachments ?? []).map((file) => file.path),
    extractStoragePathFromPublicUrl(existing.post.thumbnail),
  ].filter(Boolean)

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
