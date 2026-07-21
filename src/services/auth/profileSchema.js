/**
 * public.profiles 컬럼 정의
 *
 * 코드에서 profiles 컬럼을 추가/변경할 때:
 * 1. supabase/migrations/ 에 Migration SQL 작성
 * 2. Supabase SQL Editor에서 Migration 적용
 * 3. 이 파일과 profile.js 등 코드 수정
 *
 * @see supabase/migrations/README.md
 */
export const PROFILE_TABLE = 'profiles'

export const PROFILE_DB_COLUMNS = [
  'username',
  'name',
  'email',
  'birth_date',
  'phone',
  'role',
  'congregant_type',
  'attending_church',
]

/** PostgREST select — role 필수 (권한 판별) */
export const PROFILE_SELECT =
  'name,email,birth_date,phone,username,role,congregant_type,attending_church'

export const DEFAULT_MEMBER_ROLE = 'member'

export const VALID_PROFILE_ROLES = ['member', 'admin', 'super_admin']

export const ROLE_MIGRATION_PATH = 'supabase/migrations/004_add_role_column.sql'
