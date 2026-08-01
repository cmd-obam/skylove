import { supabase } from '@/lib/supabase'

function logRpcError(scope, error, context = {}) {
  console.group(`[AccountLinks] ${scope} RPC error`)
  console.log('context =', context)
  console.log('error.message =', error?.message ?? null)
  console.log('error.details =', error?.details ?? null)
  console.log('error.hint =', error?.hint ?? null)
  console.log('error.code =', error?.code ?? null)
  console.log('JSON.stringify(error) =', JSON.stringify(error, null, 2))
  console.groupEnd()
}

function isMissingRpcFunctionError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''

  return code === 'PGRST202' || /Could not find the function/i.test(message)
}

function mapAccountLinkError(error, fallbackMessage) {
  const message = error?.message ?? fallbackMessage

  if (isMissingRpcFunctionError(error)) {
    return '계정 연결 DB 함수가 없습니다. Supabase SQL Editor에서 supabase/fix_account_links.sql 을 실행해주세요.'
  }

  if (message.includes('접근 권한이 없습니다')) {
    return '접근 권한이 없습니다.'
  }

  return message
}

export const LOGIN_PROVIDER_LABELS = {
  email: '이메일',
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
  apple: 'Apple',
  phone: '휴대폰',
}

export function getLoginProviderLabel(provider) {
  const key = String(provider || 'email').toLowerCase()
  return LOGIN_PROVIDER_LABELS[key] || key
}

/**
 * 연결 가능한 계정 검색 (아이디·이메일·이름)
 */
export async function searchLinkableAccounts(search = '') {
  const trimmed = String(search || '').trim()

  if (trimmed.length < 2) {
    return { success: true, accounts: [] }
  }

  const response = await supabase.rpc('search_linkable_accounts_for_super_admin', {
    p_search: trimmed,
  })
  const { data, error } = response

  if (error) {
    logRpcError('searchLinkableAccounts', error, { search: trimmed })
    return {
      success: false,
      message: mapAccountLinkError(error, '연결 가능한 계정을 검색하지 못했습니다.'),
      accounts: [],
    }
  }

  return {
    success: true,
    accounts: data ?? [],
  }
}

/**
 * 대표 회원 + 연결된 보조 계정 목록
 */
export async function fetchLinkedAccounts(userId) {
  if (!userId) {
    return {
      success: false,
      message: '대상 회원 ID가 없습니다.',
      accounts: [],
    }
  }

  const response = await supabase.rpc('list_linked_accounts_for_super_admin', {
    p_user_id: userId,
  })
  const { data, error } = response

  if (error) {
    logRpcError('fetchLinkedAccounts', error, { userId })

    if (isMissingRpcFunctionError(error)) {
      return {
        success: true,
        accounts: [],
        unavailable: true,
        message: mapAccountLinkError(error, ''),
      }
    }

    return {
      success: false,
      message: mapAccountLinkError(error, '연결된 계정을 불러오지 못했습니다.'),
      accounts: [],
    }
  }

  return {
    success: true,
    accounts: data ?? [],
  }
}

/**
 * 두 계정을 하나의 회원으로 연결
 */
export async function linkMemberAccount(primaryUserId, linkedUserId) {
  if (!primaryUserId || !linkedUserId) {
    return {
      success: false,
      message: '대표 회원과 연결할 회원을 모두 지정해주세요.',
    }
  }

  if (primaryUserId === linkedUserId) {
    return {
      success: false,
      message: '같은 계정끼리는 연결할 수 없습니다.',
    }
  }

  const response = await supabase.rpc('link_member_account_by_super_admin', {
    p_payload: {
      primary_user_id: primaryUserId,
      linked_user_id: linkedUserId,
    },
  })
  const { data, error } = response

  if (error) {
    logRpcError('linkMemberAccount', error, { primaryUserId, linkedUserId })
    return {
      success: false,
      message: mapAccountLinkError(error, '계정 연결에 실패했습니다.'),
    }
  }

  if (data && data.success === false) {
    return {
      success: false,
      message: data.message || '계정 연결에 실패했습니다.',
    }
  }

  return {
    success: true,
    message: data?.message || '계정이 연결되었습니다.',
    data,
  }
}

/**
 * 계정 연결 해제 (콘텐츠 원복)
 */
export async function unlinkMemberAccount(linkedUserId) {
  if (!linkedUserId) {
    return {
      success: false,
      message: '연결 해제할 계정 ID가 없습니다.',
    }
  }

  const response = await supabase.rpc('unlink_member_account_by_super_admin', {
    p_payload: {
      linked_user_id: linkedUserId,
    },
  })
  const { data, error } = response

  if (error) {
    logRpcError('unlinkMemberAccount', error, { linkedUserId })
    return {
      success: false,
      message: mapAccountLinkError(error, '계정 연결 해제에 실패했습니다.'),
    }
  }

  if (data && data.success === false) {
    return {
      success: false,
      message: data.message || '계정 연결 해제에 실패했습니다.',
    }
  }

  return {
    success: true,
    message: data?.message || '계정 연결이 해제되었습니다.',
    data,
  }
}
