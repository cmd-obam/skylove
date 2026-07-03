/**
 * 교회소식 / 교회앨범 임시 게시글 1건씩 시드
 * 사용: node --env-file=.env scripts/seed-temp-board-posts.mjs
 *
 * SUPABASE_SERVICE_ROLE_KEY가 있으면 우선 사용합니다.
 * 없으면 VITE_SUPABASE_PUBLISHABLE_KEY로 시도합니다(관리자 RLS로 실패할 수 있음).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnvFile() {
  const envPath = resolve(root, '.env')

  if (!existsSync(envPath)) {
    return {}
  }

  const vars = {}

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const eq = trimmed.indexOf('=')

    if (eq === -1) {
      continue
    }

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    vars[key] = value
  }

  return vars
}

const env = { ...loadEnvFile(), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SECRET_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[seed] VITE_SUPABASE_URL 또는 Supabase 키가 없습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TEMP_POSTS = [
  {
    id: 'a0000001-0000-4000-8000-000000000001',
    post_type: 'church_news',
    title: '[임시] 교회소식 안내',
    content:
      '임시 게시글입니다. 추후 실제 교회소식 내용으로 업데이트됩니다.\n\n주일 예배와 교회 행사 소식을 이곳에서 안내할 예정입니다.',
    writer: '관리자',
  },
  {
    id: 'a0000001-0000-4000-8000-000000000002',
    post_type: 'album',
    title: '[임시] 교회앨범 안내',
    content:
      '임시 게시글입니다. 추후 실제 앨범 사진과 내용으로 업데이트됩니다.\n\n교회 행사와 봉사 활동 사진을 이곳에서 소개할 예정입니다.',
    writer: '관리자',
    images: [],
    thumbnail: null,
  },
]

async function ensureMeta(postType, postId, viewsCount = 12) {
  const { error: rpcError } = await supabase.rpc('ensure_board_post_meta', {
    p_post_type: postType,
    p_post_id: String(postId),
  })

  if (rpcError) {
    throw new Error(`ensure_board_post_meta failed (${postType}): ${rpcError.message}`)
  }

  const { error: updateError } = await supabase
    .from('board_post_meta')
    .update({ views_count: viewsCount })
    .eq('post_type', postType)
    .eq('post_id', String(postId))

  if (updateError) {
    throw new Error(`board_post_meta update failed (${postType}): ${updateError.message}`)
  }
}

async function upsertPost(post) {
  const { data: existing, error: readError } = await supabase
    .from('board_posts')
    .select('id')
    .eq('id', post.id)
    .maybeSingle()

  if (readError) {
    throw new Error(`read failed (${post.post_type}): ${readError.message}`)
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('board_posts')
      .update({
        title: post.title,
        content: post.content,
        writer: post.writer,
        images: post.images ?? [],
        thumbnail: post.thumbnail ?? null,
      })
      .eq('id', post.id)

    if (updateError) {
      throw new Error(`update failed (${post.post_type}): ${updateError.message}`)
    }

    console.log(`[seed] updated: ${post.post_type} / ${post.title}`)
  } else {
    const { error: insertError } = await supabase.from('board_posts').insert(post)

    if (insertError) {
      throw new Error(`insert failed (${post.post_type}): ${insertError.message}`)
    }

    console.log(`[seed] inserted: ${post.post_type} / ${post.title}`)
  }

  await ensureMeta(post.post_type, post.id)
}

async function main() {
  console.log('[seed] temp board posts starting...')

  for (const post of TEMP_POSTS) {
    await upsertPost(post)
  }

  console.log('[seed] done.')
}

main().catch((error) => {
  console.error('[seed] failed:', error.message)
  console.error(
    'SUPABASE_SERVICE_ROLE_KEY가 없으면 Supabase SQL Editor에서 supabase/migrations/012_temp_board_posts_seed.sql 을 실행하세요.',
  )
  process.exit(1)
})
