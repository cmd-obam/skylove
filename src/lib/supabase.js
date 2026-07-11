import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl?.trim()) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL이 없습니다. 로컬: .env 확인 후 dev 서버 재시작 / 배포: GitHub Actions Secrets 등록 후 재배포',
  )
}

if (!supabaseKey?.trim()) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY가 없습니다. 로컬: .env 확인 후 dev 서버 재시작 / 배포: GitHub Actions Secrets 등록 후 재배포',
  )
}

console.log('[Supabase] Client initializing', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
  },
})

console.log('[Supabase] Client ready')
