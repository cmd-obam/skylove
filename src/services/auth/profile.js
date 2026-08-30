import { supabase } from '@/lib/supabase'
import {
  describeProfileFetchRequest,
  logSupabaseError,
  serializeSupabaseError,
} from '@/lib/supabaseErrorLog'
import { mapProfileFetchError } from '@/services/auth/profileErrors'
import {
  DEFAULT_MEMBER_ROLE,
  PROFILE_SELECT,
  PROFILE_SELECT_BASE,
  PROFILE_SELECT_EXTENDED,
  PROFILE_SELECT_WITH_NICKNAME,
} from '@/services/auth/profileSchema'
import { normalizeRole } from '@/services/auth/roles'
import { logFetchProfileRoleDebug } from '@/utils/authRoleDebug'

export { PROFILE_SELECT } from '@/services/auth/profileSchema'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

function isMissingColumnError(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '').toLowerCase()

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  )
}

async function fetchProfileRoleFallback(userId) {
  const { data: roleRow, error: roleError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (roleError) {
    console.warn('[Profile] role-only fallback fetch failed', roleError)
    return null
  }

  return roleRow?.role ?? null
}

async function selectProfileRow(userId, select) {
  return supabase.from('profiles').select(select).eq('user_id', userId).single()
}

async function fetchProfileRowWithRole(userId) {
  let { data, error } = await selectProfileRow(userId, PROFILE_SELECT_WITH_NICKNAME)

  // migration 042(nickname) 미적용 환경 폴백.
  if (error && isMissingColumnError(error)) {
    console.warn(
      '[Profile] nickname select failed — retrying with extended select',
      { code: error.code, message: error.message },
    )
    ;({ data, error } = await selectProfileRow(userId, PROFILE_SELECT_EXTENDED))
  }

  // migration 015(congregant_type/attending_church) 미적용 환경 폴백.
  if (error && isMissingColumnError(error)) {
    console.warn(
      '[Profile] extended select failed (church columns missing) — retrying with base select',
      { code: error.code, message: error.message },
    )
    ;({ data, error } = await selectProfileRow(userId, PROFILE_SELECT_BASE))
  }

  if (error) {
    return { data: null, error }
  }

  if (data?.role != null) {
    return { data, error: null }
  }

  console.warn(
    '[Profile] role missing from PROFILE_SELECT response — retrying with select("*") then role-only fetch',
    { userId, select: PROFILE_SELECT },
  )

  const { data: fullRow, error: fullError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!fullError && fullRow?.role != null) {
    return { data: fullRow, error: null }
  }

  const fallbackRole = await fetchProfileRoleFallback(userId)

  if (fallbackRole != null) {
    return {
      data: {
        ...data,
        ...fullRow,
        role: fallbackRole,
      },
      error: null,
    }
  }

  return { data, error: null }
}

/**
 * 보조 로그인 계정이면 대표 auth user id 를 반환합니다.
 * account_links 테이블/정책이 없으면 입력 userId 를 그대로 씁니다.
 */
async function resolveEffectiveUserId(userId) {
  if (!userId) {
    return userId
  }

  try {
    const { data, error } = await supabase
      .from('account_links')
      .select('primary_user_id')
      .eq('linked_user_id', userId)
      .maybeSingle()

    if (error) {
      // 테이블 미적용·권한 없음 등은 기존 1:1 프로필 경로로 폴백
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.code === '42501' ||
        /account_links|does not exist|schema cache/i.test(error.message || '')
      ) {
        return userId
      }

      console.warn('[Profile] resolveEffectiveUserId failed — using auth user id', error)
      return userId
    }

    return data?.primary_user_id || userId
  } catch (error) {
    console.warn('[Profile] resolveEffectiveUserId threw — using auth user id', error)
    return userId
  }
}

export async function fetchProfileByUserId(userId) {
  const effectiveUserId = await resolveEffectiveUserId(userId)
  const request = describeProfileFetchRequest(supabaseUrl, effectiveUserId, PROFILE_SELECT)

  console.log('[Profile] fetchProfileByUserId request', {
    ...request,
    authUserId: userId,
    effectiveUserId,
  })

  const { data, error } = await fetchProfileRowWithRole(effectiveUserId)

  if (error) {
    logSupabaseError('Profile', error, {
      operation: 'fetchProfileByUserId',
      request,
    })

    const response = serializeSupabaseError(error)

    return {
      success: false,
      message: mapProfileFetchError(error),
      error,
      response,
      request,
    }
  }

  console.log(data)

  const profile = {
    name: data.name,
    email: data.email,
    role: normalizeRole(data.role) ?? data.role ?? DEFAULT_MEMBER_ROLE,
    birthday: data.birth_date,
    phone: data.phone,
    username: data.username,
    congregantType: data.congregant_type,
    attendingChurch: data.attending_church,
    nickname: data.nickname ?? '',
    nicknameEnabled: Boolean(data.nickname_enabled),
    effectiveUserId,
  }

  console.log('[Profile] fetchProfileByUserId success', {
    userId,
    effectiveUserId,
    data,
    profile,
  })

  logFetchProfileRoleDebug({ userId: effectiveUserId, data, mappedProfile: profile })

  return {
    success: true,
    profile,
  }
}

export async function fetchCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    logSupabaseError('Profile', userError, { operation: 'fetchCurrentUserProfile.getUser' })

    return {
      success: false,
      message: '로그인 정보를 확인할 수 없습니다.',
      error: userError,
      response: serializeSupabaseError(userError),
    }
  }

  return fetchProfileByUserId(user.id)
}
