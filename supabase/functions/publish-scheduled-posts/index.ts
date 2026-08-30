import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleOptionsRequest, jsonResponse, withCors } from '../_shared/cors.ts'

Deno.serve(
  withCors(async (req) => {
    if (req.method === 'OPTIONS') {
      return handleOptionsRequest()
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed', message: 'POST만 허용됩니다.' }, 405)
    }

    const cronSecret = Deno.env.get('SCHEDULED_POSTS_CRON_SECRET')
      || Deno.env.get('CONTENT_TRASH_CRON_SECRET')
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

    const { data, error } = await admin.rpc('publish_due_board_posts')

    if (error) {
      return jsonResponse({ error: 'publish_failed', message: error.message }, 500)
    }

    return jsonResponse({
      success: true,
      publishedCount: Number(data) || 0,
    })
  }),
)
