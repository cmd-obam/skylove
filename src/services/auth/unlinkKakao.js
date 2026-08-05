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

function hasGeneralLoginRegistered(user, providers) {
  if (providers.includes('email')) {
    return true
  }

  const metadata = user?.user_metadata || {}

  if (metadata.general_login_registered === true) {
    return true
  }

  // 카카오 가입 완료 시 updateUser 로 username 을 넣은 경우 (비밀번호 등록됨)
  if (typeof metadata.username === 'string' && metadata.username.trim()) {
    return true
  }

  return false
}

function buildLoginStatusLabel({ hasKakao, hasGeneralLogin, methods, primaryLabel }) {
  if (hasKakao && hasGeneralLogin) {
    return '카카오 로그인 + 일반 로그인'
  }

  if (hasKakao && !hasGeneralLogin) {
    return '카카오 로그인 (일반 로그인 미등록)'
  }

  if (methods.length > 0) {
    return methods.join(' + ')
  }

  return primaryLabel || '알 수 없음'
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
      hasGeneralLogin: false,
      canUnlinkKakao: false,
      otherLoginMethods: [],
      primaryLabel: '알 수 없음',
      loginStatusLabel: '알 수 없음',
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
  const hasGeneralLogin = hasGeneralLoginRegistered(user, providers)
  const canUnlinkKakao = hasKakao && hasGeneralLogin
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
    hasGeneralLogin,
    canUnlinkKakao,
    otherLoginMethods,
    primaryLabel,
    loginStatusLabel: buildLoginStatusLabel({
      hasKakao,
      hasGeneralLogin,
      methods,
      primaryLabel,
    }),
    identities,
    user,
  }
}

async function unlinkKakaoViaEdgeFunction() {
  const { data, error } = await supabase.functions.invoke('unlink-kakao', {
    method: 'POST',
    body: {},
  })

  if (error) {
    console.error('[UnlinkKakao] edge function invoke failed', error)
    return {
      success: false,
      message:
        error.message ||
        '카카오 계정 연동 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  if (data?.error || data?.success === false) {
    return {
      success: false,
      message:
        data?.message ||
        '카카오 계정 연동 해제에 실패했습니다. 잠시 후 다시 시도해주세요.',
      code: data?.error,
    }
  }

  return {
    success: true,
    message:
      data?.message ||
      '카카오 계정 연동이 해제되었습니다.\n이후부터는 아이디 + 비밀번호 또는 이메일 + 비밀번호 로그인만 사용할 수 있습니다.',
    remainingMethods: data?.remainingMethods,
  }
}

/**
 * 카카오 identity 연동 해제 (profiles 행은 유지)
 * - 일반 로그인이 등록된 경우에만 허용
 * - identities 가 2개 이상이면 클라이언트 unlinkIdentity
 * - 아니면 Edge Function(service role)으로 카카오 identity 제거
 */
export async function unlinkKakaoIdentity() {
  const methods = await getAccountLoginMethods()

  if (!methods.success) {
    return { success: false, message: methods.message }
  }

  if (!methods.hasKakao) {
    return { success: false, message: '카카오 계정 연동 정보를 찾을 수 없습니다.' }
  }

  if (!methods.hasGeneralLogin) {
    return {
      success: false,
      message:
        '현재 카카오 로그인만 사용 중입니다. 일반 로그인 계정을 먼저 등록해주세요.',
      code: 'NEEDS_GENERAL_LOGIN',
    }
  }

  const kakaoIdentity = methods.identities.find((item) => item.provider === 'kakao')

  if (!kakaoIdentity?.identity_id) {
    return {
      success: false,
      message: '카카오 계정 연동 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  const hasOtherIdentity = methods.identities.some((item) => item.provider !== 'kakao')

  if (hasOtherIdentity) {
    console.log('[UnlinkKakao] unlinkIdentity start', {
      identityId: kakaoIdentity.identity_id,
      provider: kakaoIdentity.provider,
      otherMethods: methods.otherLoginMethods,
    })

    const { data, error } = await supabase.auth.unlinkIdentity(kakaoIdentity)

    if (!error) {
      const after = await getAccountLoginMethods()

      if (after.success && after.hasKakao) {
        console.error('[UnlinkKakao] unlink reported success but kakao identity still present')
        return {
          success: false,
          message:
            '연동 해제 요청은 처리되었지만 카카오 연결이 남아 있습니다. 잠시 후 다시 확인해주세요.',
        }
      }

      console.log('[UnlinkKakao] unlinkIdentity success', {
        remainingMethods: after.methods,
      })

      return {
        success: true,
        message:
          '카카오 계정 연동이 해제되었습니다.\n이후부터는 아이디 + 비밀번호 또는 이메일 + 비밀번호 로그인만 사용할 수 있습니다.',
        data,
        remainingMethods: after.methods,
      }
    }

    console.warn('[UnlinkKakao] unlinkIdentity failed — trying edge function', {
      message: error.message,
      status: error.status,
      code: error.code,
    })

    const message = String(error.message || '').toLowerCase()

    if (message.includes('manual linking') || message.includes('not enabled')) {
      return {
        success: false,
        message:
          '카카오 연동 해제 기능이 서버에서 활성화되어 있지 않습니다. 관리자에게 문의해주세요. (Supabase Manual Linking)',
        error,
        code: 'MANUAL_LINKING_DISABLED',
      }
    }
  }

  const edgeResult = await unlinkKakaoViaEdgeFunction()

  if (!edgeResult.success) {
    return edgeResult
  }

  const after = await getAccountLoginMethods()

  if (after.success && after.hasKakao) {
    console.error('[UnlinkKakao] edge unlink reported success but kakao identity still present')
    return {
      success: false,
      message:
        '연동 해제 요청은 처리되었지만 카카오 연결이 남아 있습니다. 잠시 후 다시 확인해주세요.',
    }
  }

  return {
    success: true,
    message:
      edgeResult.message ||
      '카카오 계정 연동이 해제되었습니다.\n이후부터는 아이디 + 비밀번호 또는 이메일 + 비밀번호 로그인만 사용할 수 있습니다.',
    remainingMethods: after.methods?.length ? after.methods : edgeResult.remainingMethods,
  }
}
