import { supabase } from '@/lib/supabase'
import { normalizeRole, USER_ROLES } from '@/services/auth/roles'

function mapRpcError(error, fallbackMessage) {
  const code = error?.code ?? ''
  const message = error?.message ?? fallbackMessage

  if (code === 'PGRST202' || /Could not find the function/i.test(message)) {
    return '회원관리 DB 함수가 없습니다. Supabase SQL Editor에서 supabase/fix_super_admin_member_management.sql 을 실행해주세요.'
  }

  if (message.includes('접근 권한이 없습니다')) {
    return '접근 권한이 없습니다.'
  }

  return message
}

export async function fetchMembersForSuperAdmin(search = '') {
  const { data, error } = await supabase.rpc('list_profiles_for_super_admin', {
    p_search: search.trim() || null,
  })

  if (error) {
    console.error('[MemberManagement] fetchMembersForSuperAdmin failed', error)

    return {
      success: false,
      message: mapRpcError(error, '회원 목록을 불러오지 못했습니다.'),
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

  const { error } = await supabase.rpc('update_member_role_by_super_admin', {
    p_target_user_id: userId,
    p_new_role: normalizedRole,
  })

  if (error) {
    console.error('[MemberManagement] updateMemberRoleBySuperAdmin failed', error)

    return {
      success: false,
      message: mapRpcError(error, '권한 변경에 실패했습니다.'),
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
