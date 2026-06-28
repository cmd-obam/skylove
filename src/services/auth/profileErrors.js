import { serializeSupabaseError } from '@/lib/supabaseErrorLog'
import { ROLE_MIGRATION_PATH } from '@/services/auth/profileSchema'

export function mapProfileFetchError(error) {
  const response = serializeSupabaseError(error)
  const code = response?.code ?? ''
  const message = (response?.message ?? '').toLowerCase()

  console.error('[Profile] Supabase response (mapProfileFetchError)', JSON.stringify(response, null, 2))

  if (code === '42703' && message.includes('role')) {
    console.error(
      `[Profile] FIX: Supabase SQL Editor에서 ${ROLE_MIGRATION_PATH} 또는 supabase/fix_login_role.sql 실행 필요`,
    )
    return response.message ?? 'column profiles.role does not exist'
  }

  if (code === 'PGRST204' && message.includes('role')) {
    console.error('[Profile] FIX: role 컬럼은 있으나 PostgREST 캐시 stale — NOTIFY pgrst, \'reload schema\'; 실행')
    return response.message ?? 'PostgREST schema cache: role column not found'
  }

  if (code === 'PGRST116' || message.includes('0 rows')) {
    return '회원 정보를 찾을 수 없습니다.'
  }

  if (code === '42501' || message.includes('row-level security')) {
    return response.message ?? '회원 정보 조회 권한이 없습니다.'
  }

  return response.message ?? '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
