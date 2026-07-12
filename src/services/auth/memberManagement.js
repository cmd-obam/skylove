import { supabase } from '@/lib/supabase'
import { normalizeRole, USER_ROLES } from '@/services/auth/roles'

function logRpcError(scope, error, context = {}) {
  console.group(`[MemberManagement] ${scope} RPC error`)
  console.log('context =', context)
  console.log('error.message =', error?.message ?? null)
  console.log('error.details =', error?.details ?? null)
  console.log('error.hint =', error?.hint ?? null)
  console.log('error.code =', error?.code ?? null)
  console.log('JSON.stringify(error) =', JSON.stringify(error, null, 2))
  console.groupEnd()
}

function logRpcResponse(scope, response, context = {}) {
  console.group(`[MemberManagement] ${scope} RPC response`)
  console.log('context =', context)
  console.log('data =', response?.data ?? null)
  console.log('error =', response?.error ?? null)
  console.log('JSON.stringify(error) =', JSON.stringify(response?.error ?? null, null, 2))
  console.groupEnd()
}

function isMissingRpcFunctionError(error) {
  const code = error?.code ?? ''
  const message = error?.message ?? ''

  return code === 'PGRST202' || /Could not find the function/i.test(message)
}

function mapListFetchError(error, fallbackMessage) {
  const message = error?.message ?? fallbackMessage

  if (isMissingRpcFunctionError(error)) {
    return '회원관리 DB 함수가 없습니다. Supabase SQL Editor에서 supabase/fix_super_admin_member_management.sql 을 실행해주세요.'
  }

  if (message.includes('접근 권한이 없습니다')) {
    return '접근 권한이 없습니다.'
  }

  return message
}

function mapUpdateRoleError(error, fallbackMessage) {
  const message = error?.message ?? fallbackMessage

  if (isMissingRpcFunctionError(error)) {
    return '권한 변경 RPC 함수를 찾을 수 없습니다. update_member_role_by_super_admin(p_payload jsonb) 시그니처를 확인해주세요.'
  }

  if (message.includes('접근 권한이 없습니다')) {
    return '접근 권한이 없습니다.'
  }

  return message
}

export async function fetchMembersForSuperAdmin(search = '') {
  const rpcParams = { p_search: search.trim() || null }

  const response = await supabase.rpc('list_profiles_for_super_admin', rpcParams)
  const { data, error } = response

  console.log('[MemberManagement] fetchMembersForSuperAdmin response', { data, error })
  console.log('[MemberManagement] fetchMembersForSuperAdmin error JSON', JSON.stringify(error, null, 2))

  if (error) {
    logRpcError('fetchMembersForSuperAdmin', error, {
      rpc: 'list_profiles_for_super_admin',
      params: rpcParams,
    })

    return {
      success: false,
      message: mapListFetchError(error, '회원 목록을 불러오지 못했습니다.'),
      members: [],
    }
  }

  return {
    success: true,
    members: data ?? [],
  }
}

export async function updateMemberRoleBySuperAdmin(userId, newRole) {
  const normalizedRole = normalizeRole(newRole)

  if (normalizedRole !== USER_ROLES.MEMBER && normalizedRole !== USER_ROLES.ADMIN) {
    return {
      success: false,
      message: '변경할 수 없는 권한입니다.',
    }
  }

  const rpcParams = {
    p_payload: {
      target_user_id: userId,
      new_role: normalizedRole,
    },
  }

  console.log('[MemberManagement] updateMemberRoleBySuperAdmin request', {
    rpc: 'update_member_role_by_super_admin',
    params: rpcParams,
  })

  const response = await supabase.rpc('update_member_role_by_super_admin', rpcParams)
  const { data, error } = response

  console.log('[MemberManagement] updateMemberRoleBySuperAdmin response', { data, error })
  console.log('[MemberManagement] updateMemberRoleBySuperAdmin error JSON', JSON.stringify(error, null, 2))
  logRpcResponse('updateMemberRoleBySuperAdmin', response, {
    rpc: 'update_member_role_by_super_admin',
    params: rpcParams,
    note: 'SQL 시그니처: update_member_role_by_super_admin(p_payload jsonb) — payload: { target_user_id, new_role }',
  })

  if (error) {
    logRpcError('updateMemberRoleBySuperAdmin', error, {
      rpc: 'update_member_role_by_super_admin',
      params: rpcParams,
    })

    return {
      success: false,
      message: mapUpdateRoleError(error, '권한 변경에 실패했습니다.'),
    }
  }

  return {
    success: true,
    message: '권한이 변경되었습니다.',
  }
}

export async function deleteMemberBySuperAdmin(userId) {
  const { data, error } = await supabase.functions.invoke('admin-delete-member', {
    body: { targetUserId: userId },
  })

  if (error) {
    console.error('[MemberManagement] deleteMemberBySuperAdmin failed', error)

    return {
      success: false,
      message: '회원 삭제 서버 호출에 실패했습니다. Edge Function(admin-delete-member) 배포를 확인해주세요.',
    }
  }

  if (data?.error) {
    return {
      success: false,
      message: data.message || '회원 삭제에 실패했습니다.',
    }
  }

  return {
    success: true,
    message: '회원 탈퇴 처리가 완료되었습니다.',
  }
}
