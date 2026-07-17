import { supabase } from '@/lib/supabase'

export const LOGIN_METHOD_LABELS = {
  kakao: '카카오 로그인',
  naver: '네이버 로그인',
  email: '이메일 로그인',
  phone: '휴대폰 로그인',
}

/**
 * 현재 세션 사용자의 로그인 방식 라벨과 카카오 identity 존재 여부
 */
export async function getAccountLoginMethods() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: '로그인 세션을 확인할 수 없습니다.',
      methods: [],
      hasKakao: false,
      primaryLabel: '알 수 없음',
      identities: [],
    }
  }

  let identities = user.identities ?? []

  try {
    const { data, error } = await supabase.auth.getUserIdentities()
    if (!error) {
      identities = data?.identities ?? identities
    }
  } catch {
    // getUserIdentities 미지원/실패 시 user.identities 사용
  }

  const providers = [...new Set(identities.map((item) => item.provider).filter(Boolean))]
  const hasKakao = providers.includes('kakao')
  const methods = providers.map((provider) => LOGIN_METHOD_LABELS[provider] || provider)
  const primaryLabel =
    (hasKakao && LOGIN_METHOD_LABELS.kakao) ||
    methods[0] ||
    (user.app_metadata?.provider
      ? LOGIN_METHOD_LABELS[user.app_metadata.provider] || user.app_metadata.provider
      : LOGIN_METHOD_LABELS.email)

  return {
    success: true,
    methods,
    hasKakao,
    primaryLabel,
    identities,
    user,
  }
}

/**
 * 카카오 identity 연동 해제 (profiles 행은 유지)
 */
export async function unlinkKakaoIdentity() {
  const methods = await getAccountLoginMethods()

  if (!methods.success) {
    return { success: false, message: methods.message }
  }

  if (!methods.hasKakao) {
    return { success: false, message: '카카오 계정 연동 정보를 찾을 수 없습니다.' }
  }

  const kakaoIdentity = methods.identities.find((item) => item.provider === 'kakao')

  if (!kakaoIdentity) {
    return { success: false, message: '카카오 계정 연동 정보를 찾을 수 없습니다.' }
  }

  const { data, error } = await supabase.auth.unlinkIdentity(kakaoIdentity)

  if (error) {
    console.error('[UnlinkKakao] unlinkIdentity failed', error)
    const message = String(error.message || '').toLowerCase()

    if (message.includes('at least 2') || message.includes('manual linking')) {
      return {
        success: false,
        message:
          '카카오 연동만 있는 계정은 바로 해제할 수 없습니다. 이메일 등 다른 로그인 방식을 추가한 뒤 다시 시도하거나, 관리자에게 문의해주세요.',
        error,
      }
    }

    return {
      success: false,
      message: error.message || '카카오 계정 연동 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  return {
    success: true,
    message: '카카오 계정 연동이 해제되었습니다.',
    data,
  }
}
