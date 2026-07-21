import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

const BUCKET = 'board-uploads'
const MARKER = '/object/public/board-uploads/'

function extractStoragePath(url: string | null | undefined) {
  if (!url || typeof url !== 'string') {
    return null
  }

  const index = url.indexOf(MARKER)
  if (index === -1) {
    return null
  }

  try {
    return decodeURIComponent(url.slice(index + MARKER.length).split('?')[0])
  } catch {
    return url.slice(index + MARKER.length).split('?')[0]
  }
}

function extractContentImagePaths(html: string | null | undefined) {
  if (!html) {
    return [] as string[]
  }

  const paths: string[] = []
  const matches = html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)

  for (const match of matches) {
    const path = extractStoragePath(match[1])
    if (path) {
      paths.push(path)
    }
  }

  return paths
}

function collectPostStoragePaths(post: Record<string, unknown>) {
  const paths = new Set<string>()

  for (const path of extractContentImagePaths(String(post.content ?? ''))) {
    paths.add(path)
  }

  const thumb = extractStoragePath(String(post.thumbnail ?? ''))
  if (thumb) {
    paths.add(thumb)
  }

  const legacy = extractStoragePath(String(post.attachment_url ?? ''))
  if (legacy) {
    paths.add(legacy)
  }

  const images = Array.isArray(post.images) ? post.images : []
  for (const image of images) {
    const item = image as { path?: string; url?: string; src?: string }
    if (item.path) {
      paths.add(item.path)
    } else {
      const fromUrl = extractStoragePath(item.url || item.src || '')
      if (fromUrl) {
        paths.add(fromUrl)
      }
    }
  }

  const attachments = Array.isArray(post.attachments) ? post.attachments : []
  for (const file of attachments) {
    const item = file as { path?: string; url?: string }
    if (item.path) {
      paths.add(item.path)
    } else {
      const fromUrl = extractStoragePath(item.url || '')
      if (fromUrl) {
        paths.add(fromUrl)
      }
    }
  }

  return [...paths]
}

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed', message: 'POST만 허용됩니다.' }, 405)
    }

    const cronSecret = Deno.env.get('CONTENT_TRASH_CRON_SECRET')
    const providedSecret = req.headers.get('x-cron-secret')

    if (!cronSecret || providedSecret !== cronSecret) {
      return jsonResponse({ error: 'forbidden', message: 'cron secret이 필요합니다.' }, 403)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'server_config', message: '서버 설정 오류' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const days = 15
    const postLimit = 40
    const commentLimit = 200

    const { data: expiredPosts, error: postsError } = await admin.rpc('list_expired_trash_posts', {
      p_days: days,
      p_limit: postLimit,
    })

    if (postsError) {
      return jsonResponse({ error: 'list_posts_failed', message: postsError.message }, 500)
    }

    const { data: expiredComments, error: commentsError } = await admin.rpc(
      'list_expired_trash_comments',
      {
        p_days: days,
        p_limit: commentLimit,
      },
    )

    if (commentsError) {
      return jsonResponse({ error: 'list_comments_failed', message: commentsError.message }, 500)
    }

    let purgedPosts = 0
    let purgedComments = 0
    let removedFiles = 0
    const failures: string[] = []

    for (const post of expiredPosts ?? []) {
      const postId = String(post.id)
      const postType = String(post.post_type)
      const storagePaths = collectPostStoragePaths(post)

      if (storagePaths.length > 0) {
        const { error: storageError } = await admin.storage.from(BUCKET).remove(storagePaths)
        if (storageError) {
          failures.push(`storage:${postId}:${storageError.message}`)
          continue
        }
        removedFiles += storagePaths.length
      }

      const { error: commentsDeleteError } = await admin
        .from('board_comments')
        .delete()
        .eq('post_type', postType)
        .eq('post_id', postId)

      if (commentsDeleteError) {
        failures.push(`comments:${postId}:${commentsDeleteError.message}`)
        continue
      }

      await admin.from('post_likes').delete().eq('post_type', postType).eq('post_id', postId)
      await admin.from('board_post_meta').delete().eq('post_type', postType).eq('post_id', postId)
      await admin.from('admin_content_notes').delete().eq('target_type', 'post').eq('target_id', post.id)

      const { error: postDeleteError } = await admin.from('board_posts').delete().eq('id', post.id)

      if (postDeleteError) {
        failures.push(`post:${postId}:${postDeleteError.message}`)
        continue
      }

      purgedPosts += 1
    }

    for (const comment of expiredComments ?? []) {
      await admin
        .from('admin_content_notes')
        .delete()
        .eq('target_type', 'comment')
        .eq('target_id', comment.id)

      const { error: commentDeleteError } = await admin
        .from('board_comments')
        .delete()
        .eq('id', comment.id)

      if (commentDeleteError) {
        failures.push(`comment:${comment.id}:${commentDeleteError.message}`)
        continue
      }

      purgedComments += 1
    }

    return jsonResponse({
      success: true,
      purgedPosts,
      purgedComments,
      removedFiles,
      failures,
    })
  }),
)
