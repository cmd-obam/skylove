import { supabase } from '@/lib/supabase'

export const LOGIN_METHOD_LABELS = {
  kakao: '카카오 로그인',
  naver: '네이버 로그인',
  email: '이메일 로그인',
  phone: '휴대폰 로그인',
}

function normalizeIdentities(rawIdentities) {
  if (!Array.isArray(rawIdentities)) {
    return []
  }

  return rawIdentities
    .filter((item) => item && item.provider)
    .map((item) => ({
      ...item,
      // unlinkIdentity API는 path에 identity_id 를 사용합니다.
      identity_id: item.identity_id || item.id,
    }))
}

async function fetchUserIdentities() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.',
      user: null,
      identities: [],
    }
  }

  let identities = normalizeIdentities(user.identities)

  try {
    const { data, error } = await supabase.auth.getUserIdentities()

    if (!error && data?.identities) {
      identities = normalizeIdentities(data.identities)
    } else if (error) {
      console.warn('[UnlinkKakao] getUserIdentities failed — fallback to user.identities', error)
    }
  } catch (error) {
    console.warn('[UnlinkKakao] getUserIdentities exception — fallback to user.identities', error)
  }

  return {
    success: true,
    user,
    identities,
  }
}

/**
 * 현재 세션 사용자의 로그인 방식 라벨과 카카오 identity 존재 여부
 */
export async function getAccountLoginMethods() {
  const fetched = await fetchUserIdentities()

  if (!fetched.success) {
    return {
      success: false,
      message: fetched.message,
      methods: [],
      hasKakao: false,
      canUnlinkKakao: false,
      otherLoginMethods: [],
      primaryLabel: '알 수 없음',
      identities: [],
    }
  }

  const { identities, user } = fetched
  const providers = [...new Set(identities.map((item) => item.provider))]
  const hasKakao = providers.includes('kakao')
  const otherProviders = providers.filter((provider) => provider !== 'kakao')
  const otherLoginMethods = otherProviders.map(
    (provider) => LOGIN_METHOD_LABELS[provider] || provider,
  )
  const methods = providers.map((provider) => LOGIN_METHOD_LABELS[provider] || provider)
  const canUnlinkKakao = hasKakao && otherProviders.length > 0
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
    canUnlinkKakao,
    otherLoginMethods,
    primaryLabel,
    identities,
    user,
  }
}

/**
 * 카카오 identity 연동 해제 (profiles 행은 유지)
 * - 카카오만 있는 계정은 해제 불가
 * - 이메일 등 다른 identity가 있을 때만 Supabase unlinkIdentity 호출
 */
export async function unlinkKakaoIdentity() {
  const methods = await getAccountLoginMethods()

  if (!methods.success) {
    return { success: false, message: methods.message }
  }

  if (!methods.hasKakao) {
    return { success: false, message: '카카오 계정 연동 정보를 찾을 수 없습니다.' }
  }

  if (!methods.canUnlinkKakao) {
    return {
      success: false,
      message:
        '현재 로그인 수단이 카카오뿐이라 연동을 해제할 수 없습니다. 이메일 등 다른 로그인 수단을 추가한 뒤에만 카카오 연동을 해제할 수 있습니다.',
      code: 'ONLY_KAKAO_IDENTITY',
    }
  }

  const kakaoIdentity = methods.identities.find((item) => item.provider === 'kakao')

  if (!kakaoIdentity?.identity_id) {
    return {
      success: false,
      message: '카카오 계정 연동 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  console.log('[UnlinkKakao] unlinkIdentity start', {
    identityId: kakaoIdentity.identity_id,
    provider: kakaoIdentity.provider,
    otherMethods: methods.otherLoginMethods,
  })

  const { data, error } = await supabase.auth.unlinkIdentity(kakaoIdentity)

  if (error) {
    console.error('[UnlinkKakao] unlinkIdentity failed', {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
    })

    const message = String(error.message || '').toLowerCase()

    if (message.includes('at least 2') || message.includes('single identity')) {
      return {
        success: false,
        message:
          '현재 로그인 수단이 카카오뿐이라 연동을 해제할 수 없습니다. 이메일 등 다른 로그인 수단을 추가한 뒤에만 카카오 연동을 해제할 수 있습니다.',
        error,
        code: 'ONLY_KAKAO_IDENTITY',
      }
    }

    if (message.includes('manual linking') || message.includes('not enabled')) {
      return {
        success: false,
        message:
          '카카오 연동 해제 기능이 서버에서 활성화되어 있지 않습니다. 관리자에게 문의해주세요. (Supabase Manual Linking)',
        error,
        code: 'MANUAL_LINKING_DISABLED',
      }
    }

    return {
      success: false,
      message: error.message || '카카오 계정 연동 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  // 해제 결과 검증
  const after = await getAccountLoginMethods()

  if (after.success && after.hasKakao) {
    console.error('[UnlinkKakao] unlink reported success but kakao identity still present')
    return {
      success: false,
      message: '연동 해제 요청은 처리되었지만 카카오 연결이 남아 있습니다. 잠시 후 다시 확인해주세요.',
    }
  }

  console.log('[UnlinkKakao] unlinkIdentity success', {
    remainingMethods: after.methods,
  })

  return {
    success: true,
    message: '카카오 계정 연동이 해제되었습니다.',
    data,
    remainingMethods: after.methods,
  }
}
