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
export const PROFILE_SELECT_BASE = 'name,email,birth_date,phone,username,role'

/** 교회정보 포함 확장 select (migration 015 적용 시 사용 가능) */
export const PROFILE_SELECT_EXTENDED = `${PROFILE_SELECT_BASE},congregant_type,attending_church`

/**
 * 기본 프로필 select.
 * 교회정보 컬럼은 확장 select(PROFILE_SELECT_EXTENDED)로 조회하며,
 * 컬럼 미적용 환경에서는 기본 select로 자동 폴백합니다.
 */
export const PROFILE_SELECT = PROFILE_SELECT_BASE

export const DEFAULT_MEMBER_ROLE = 'member'

export const VALID_PROFILE_ROLES = ['member', 'manager', 'admin', 'super_admin']

export const ROLE_MIGRATION_PATH = 'supabase/migrations/004_add_role_column.sql'
