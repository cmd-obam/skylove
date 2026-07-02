import { supabase } from '@/lib/supabase'
import { clearAuthSession } from '@/utils/auth'
import { clearSignupDraft } from '@/utils/signupDraft'

function logDeleteStep(label, success, details) {
  const icon = success ? '✅' : '❌'
  if (details !== undefined) {
    console.log(`${icon} ${label}`, details)
  } else {
    console.log(`${icon} ${label}`)
  }
}

export function clearAllMemberStorage() {
  clearAuthSession()
  clearSignupDraft()
}

export async function deleteAccount() {
  console.group('[Delete Account]')

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logDeleteStep('현재 사용자 확인', false, userError)
      console.groupEnd()
      return {
        success: false,
        step: 'user',
        message: '로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.',
      }
    }

    logDeleteStep('현재 사용자 확인', true, { userId: user.id, email: user.email })

    const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', user.id)

    if (profileError) {
      logDeleteStep('profiles 삭제', false, profileError)
      console.groupEnd()
      return {
        success: false,
        step: 'profile',
        message: profileError.message || '회원 프로필 삭제에 실패했습니다.',
      }
    }

    logDeleteStep('profiles 삭제', true, { userId: user.id })

    const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-account')

    if (fnError) {
      logDeleteStep('auth 삭제', false, fnError)
      console.groupEnd()
      return {
        success: false,
        step: 'auth',
        message:
          '계정 삭제 서버 호출에 실패했습니다. Supabase Edge Function(delete-account) 배포를 확인해주세요.',
        error: fnError,
      }
    }

    if (fnData?.error) {
      logDeleteStep('auth 삭제', false, fnData)
      console.groupEnd()
      return {
        success: false,
        step: 'auth',
        message: fnData.message || '계정 삭제에 실패했습니다.',
        error: fnData,
      }
    }

    logDeleteStep('auth 삭제', true, { userId: fnData?.userId ?? user.id })

    try {
      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        console.warn('[Delete Account] session 삭제 실패 (로그만 출력)', signOutError)
        logDeleteStep('session 삭제', false, signOutError)
      } else {
        logDeleteStep('session 삭제', true)
      }
    } catch (signOutError) {
      console.warn('[Delete Account] session 삭제 예외 (로그만 출력)', signOutError)
      logDeleteStep('session 삭제', false, signOutError)
    }

    try {
      clearAllMemberStorage()
      logDeleteStep('localStorage / sessionStorage 삭제', true)
    } catch (storageError) {
      console.warn('[Delete Account] storage 삭제 실패 (로그만 출력)', storageError)
      logDeleteStep('localStorage / sessionStorage 삭제', false, storageError)
    }

    logDeleteStep('로그아웃 완료', true)
    logDeleteStep('회원탈퇴 완료', true)
    console.groupEnd()

    return {
      success: true,
      message: '회원탈퇴가 완료되었습니다.',
    }
  } catch (error) {
    console.error('[Delete Account] 예외', error)
    logDeleteStep('회원탈퇴 완료', false, error)
    console.groupEnd()

    return {
      success: false,
      step: 'unknown',
      message: '회원탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }
}
