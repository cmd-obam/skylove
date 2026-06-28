import { supabase } from '@/lib/supabase'
import {
  DB_QUERY_FAILED_MESSAGE,
  EMAIL_NOT_CONFIRMED_MESSAGE,
  mapSupabaseLoginError,
  USERNAME_NOT_FOUND_MESSAGE,
} from '@/services/auth/loginErrors'
import { fetchProfileByUserId } from '@/services/auth/profile'

export async function handleLogin({ loginId, password }) {
  const trimmedLoginId = String(loginId ?? '').trim()

  if (!trimmedLoginId) {
    return { success: false, message: '아이디를 입력해주세요.', reason: 'validation' }
  }

  if (!password) {
    return { success: false, message: '비밀번호를 입력해주세요.', reason: 'validation' }
  }

  console.log('[Login] profiles 조회 시작', { username: trimmedLoginId })

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', trimmedLoginId)
    .single()

  console.log(data)
  console.log(error)

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[Login] 실패 원인: 아이디 없음 (조회 결과 0건)', {
        username: trimmedLoginId,
        hint: 'RLS 정책으로 anon SELECT가 차단된 경우에도 이 오류가 발생할 수 있습니다.',
      })
      return {
        success: false,
        message: USERNAME_NOT_FOUND_MESSAGE,
        reason: 'username_not_found',
      }
    }

    console.log('[Login] 실패 원인: DB 조회 실패', error)
    return {
      success: false,
      message: DB_QUERY_FAILED_MESSAGE,
      reason: 'db_query_failed',
      error: {
        message: error.message,
        code: error.code,
        status: error.status,
      },
    }
  }

  if (!data?.email) {
    console.log('[Login] 실패 원인: 아이디 없음 (email 필드 없음)', { username: trimmedLoginId })
    return {
      success: false,
      message: USERNAME_NOT_FOUND_MESSAGE,
      reason: 'username_not_found',
    }
  }

  console.log('[Login] signInWithPassword 호출', { email: data.email })

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password,
  })

  console.log(authData)
  console.log(authError)

  if (authError) {
    const message = mapSupabaseLoginError(authError, { usernameResolved: true })

    if (message === EMAIL_NOT_CONFIRMED_MESSAGE) {
      console.log('[Login] 실패 원인: 이메일 미인증', authError)
    } else {
      console.log('[Login] 실패 원인: 비밀번호 틀림 또는 Auth 오류', authError)
    }

    return {
      success: false,
      message,
      reason:
        message === EMAIL_NOT_CONFIRMED_MESSAGE ? 'email_not_confirmed' : 'invalid_credentials',
      error: {
        message: authError.message,
        code: authError.code,
        status: authError.status,
      },
    }
  }

  if (authData.user && !authData.user.email_confirmed_at) {
    await supabase.auth.signOut()
    console.log('[Login] 실패 원인: 이메일 미인증', {
      userId: authData.user.id,
      email: authData.user.email,
    })

    return {
      success: false,
      message: EMAIL_NOT_CONFIRMED_MESSAGE,
      reason: 'email_not_confirmed',
    }
  }

  const profileResult = await fetchProfileByUserId(authData.user.id)

  if (!profileResult.success) {
    await supabase.auth.signOut()
    console.log('[Login] 실패 원인: DB 조회 실패 (프로필)', profileResult.message)

    return {
      success: false,
      message: profileResult.message,
      reason: 'db_query_failed',
    }
  }

  console.log('[Login] 로그인 성공', { userId: authData.user.id, email: authData.user.email })

  return {
    success: true,
    profile: profileResult.profile,
    session: authData.session,
  }
}
