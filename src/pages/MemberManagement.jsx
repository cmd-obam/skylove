import { useCallback, useEffect, useState } from 'react'
import { FiUsers } from 'react-icons/fi'
import AccountLinkModal from '@/components/auth/AccountLinkModal'
import MaskedPiiField from '@/components/auth/MaskedPiiField'
import MemberDetailSections from '@/components/auth/MemberDetailSections'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import {
  fetchLinkedAccounts,
  unlinkMemberAccount,
} from '@/services/auth/accountLinks'
import {
  deleteMemberBySuperAdmin,
  fetchMemberDetailForSuperAdmin,
  fetchMembersForSuperAdmin,
  updateMemberRoleBySuperAdmin,
} from '@/services/auth/memberManagement'
import {
  ASSIGNABLE_ROLES,
  canChangeMemberRole,
  canDeleteMemberBySuperAdmin,
  getRoleLabel,
  normalizeRole,
  USER_ROLES,
} from '@/services/auth/roles'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { PII_FIELD } from '@/utils/maskPii'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './MemberManagement.css'

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="member-management-modal" role="presentation">
      <div
        className="member-management-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-management-modal-title"
      >
        <h2 id="member-management-modal-title" className="member-management-modal__title">
          {title}
        </h2>
        <p className="member-management-modal__message">{message}</p>
        {errorMessage ? (
          <p className="member-management-modal__status member-management-modal__status--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberDetailModal({
  isOpen,
  loading,
  error,
  member,
  linkedAccounts,
  linkedLoading,
  linkedError,
  unlinkingUserId,
  onUnlink,
  onClose,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="member-management-modal" role="presentation" onClick={onClose}>
      <div
        className="member-management-modal__dialog member-management-modal__dialog--detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="member-detail-modal-title" className="member-management-modal__title">
          회원 상세정보
        </h2>

        <div className="member-management-modal__body">
          {loading ? (
            <p className="member-management-modal__status">불러오는 중...</p>
          ) : error ? (
            <p className="member-management-modal__status member-management-modal__status--error" role="alert">
              {error}
            </p>
          ) : (
            <MemberDetailSections
              member={member}
              linkedAccounts={linkedAccounts}
              linkedLoading={linkedLoading}
              linkedError={linkedError}
              unlinkingUserId={unlinkingUserId}
              onUnlink={onUnlink}
            />
          )}
        </div>

        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberManagement() {
  const [members, setMembers] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [roleModal, setRoleModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [roleError, setRoleError] = useState('')
  const [detailModal, setDetailModal] = useState(null)
  const [detailMember, setDetailMember] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const [linkedLoading, setLinkedLoading] = useState(false)
  const [linkedError, setLinkedError] = useState('')
  const [unlinkingUserId, setUnlinkingUserId] = useState('')
  const [linkModalMember, setLinkModalMember] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadLinkedAccounts = useCallback(async (userId) => {
    if (!userId) {
      setLinkedAccounts([])
      setLinkedError('')
      setLinkedLoading(false)
      return
    }

    setLinkedLoading(true)
    setLinkedError('')

    const result = await fetchLinkedAccounts(userId)

    if (!result.success) {
      setLinkedAccounts([])
      setLinkedError(result.message || '연결된 계정을 불러오지 못했습니다.')
      setLinkedLoading(false)
      return
    }

    setLinkedAccounts(result.accounts || [])
    setLinkedError(result.unavailable ? result.message || '' : '')
    setLinkedLoading(false)
  }, [])

  const loadMembers = useCallback(async (query) => {
    setLoading(true)
    setFeedback(null)

    const result = await fetchMembersForSuperAdmin(query)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      setMembers([])
      setLoading(false)
      return false
    }

    setMembers(result.members)
    setLoading(false)
    return true
  }, [])

  useEffect(() => {
    loadMembers(searchQuery)
  }, [loadMembers, searchQuery])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchKeyword.trim())
  }

  const handleOpenDetail = async (member) => {
    setDetailModal({ userId: member.user_id, name: member.name })
    setDetailMember(null)
    setDetailError('')
    setDetailLoading(true)
    setLinkedAccounts([])
    setLinkedError('')
    void loadLinkedAccounts(member.user_id)

    const result = await fetchMemberDetailForSuperAdmin(member.user_id)

    if (!result.success || !result.member) {
      setDetailError(result.message || '회원 상세정보를 불러오지 못했습니다.')
      setDetailMember(null)
      setDetailLoading(false)
      return
    }

    setDetailMember(result.member)
    setDetailLoading(false)
  }

  const handleCloseDetail = () => {
    setDetailModal(null)
    setDetailMember(null)
    setDetailError('')
    setDetailLoading(false)
    setLinkedAccounts([])
    setLinkedError('')
    setLinkedLoading(false)
    setUnlinkingUserId('')
  }

  const handleLinked = async () => {
    setLinkModalMember(null)
    await loadMembers(searchQuery)
    if (detailModal?.userId) {
      await loadLinkedAccounts(detailModal.userId)
    }
    setFeedback({ type: 'success', message: '계정이 연결되었습니다.' })
  }

  const handleUnlinkAccount = async (account) => {
    if (!account?.user_id || account.is_primary) {
      return
    }

    const confirmed = window.confirm(
      `${account.name || account.username || '선택한 계정'} 연결을 해제하시겠습니까?\n이관했던 게시글·댓글·좋아요는 해당 계정으로 되돌립니다.`,
    )

    if (!confirmed) {
      return
    }

    setUnlinkingUserId(account.user_id)
    setLinkedError('')

    const result = await unlinkMemberAccount(account.user_id)

    if (!result.success) {
      setLinkedError(result.message || '계정 연결 해제에 실패했습니다.')
      setUnlinkingUserId('')
      return
    }

    setUnlinkingUserId('')
    await loadMembers(searchQuery)
    if (detailModal?.userId) {
      await loadLinkedAccounts(detailModal.userId)
    }
    setFeedback({ type: 'success', message: result.message || '계정 연결이 해제되었습니다.' })
  }

  const handleRoleConfirm = async () => {
    if (!roleModal) {
      return
    }

    setIsSubmitting(true)
    setRoleError('')

    const result = await updateMemberRoleBySuperAdmin(roleModal.userId, roleModal.nextRole)

    if (!result.success) {
      setRoleError(result.message)
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    setRoleModal(null)
    setRoleError('')
    setIsSubmitting(false)
    await loadMembers(searchQuery)
    setFeedback({ type: 'success', message: result.message })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) {
      return
    }

    const targetUserId = deleteModal.userId
    setIsSubmitting(true)
    setDeleteError('')

    const result = await deleteMemberBySuperAdmin(targetUserId)

    if (!result.success) {
      const message = result.message || '회원 삭제에 실패했습니다.'
      console.error('[MemberManagement] delete failed', result)
      setDeleteError(message)
      setFeedback({ type: 'error', message })
      setIsSubmitting(false)
      // 실패 시 모달을 닫지 않아 에러 메시지를 확인 가능하게 합니다.
      return
    }

    // 새로고침 없이 목록에서 즉시 제거 후 서버 목록으로 재동기화
    setMembers((prev) => prev.filter((member) => member.user_id !== targetUserId))
    setDeleteModal(null)
    setDeleteError('')
    setIsSubmitting(false)
    setFeedback({ type: 'success', message: result.message })
    await loadMembers(searchQuery)
  }

  return (
    <MemberMypageLayout>
      <div className="member-management-page">
        <header className="member-management-page__header">
          <h1 className="member-management-page__title">회원관리</h1>
          <p className="member-management-page__subtitle">
            회원 목록 조회, 권한 변경, 탈퇴 처리를 할 수 있습니다.
          </p>
        </header>

        <form className="member-management-page__search" onSubmit={handleSearchSubmit} autoComplete="off">
          <label htmlFor="member-management-search" className="visually-hidden">
            이름 또는 이메일 검색
          </label>
          <input
            id="member-management-search"
            type="search"
            className="member-management-page__search-input"
            placeholder="이름 또는 이메일 검색"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            autoComplete={AUTOCOMPLETE_OFF}
          />
          <button type="submit" className="member-management-page__search-button">
            검색
          </button>
        </form>

        {feedback &&
          !(
            feedback.type === 'error' &&
            members.length > 0 &&
            feedback.message.includes('회원관리 DB 함수가 없습니다')
          ) && (
          <p
            className={`member-management-page__feedback member-management-page__feedback--${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        )}

        <div className="member-management-page__table-wrap">
          <table className="member-management-page__table">
            <colgroup>
              <col className="member-management-page__col-name" />
              <col className="member-management-page__col-email" />
              <col className="member-management-page__col-username" />
              <col className="member-management-page__col-phone" />
              <col className="member-management-page__col-role" />
              <col className="member-management-page__col-date" />
              <col className="member-management-page__col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">아이디</th>
                <th scope="col">휴대폰</th>
                <th scope="col">권한</th>
                <th scope="col">가입일</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="member-management-page__empty">
                    불러오는 중...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="member-management-page__empty">
                    <div className="member-management-page__empty-inner">
                      <FiUsers className="member-management-page__empty-icon" aria-hidden="true" />
                      <span>검색 결과가 없습니다.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const memberRole = normalizeRole(member.role)
                  const canChangeRole = canChangeMemberRole(memberRole)
                  const canDelete = canDeleteMemberBySuperAdmin(memberRole)

                  return (
                    <tr key={member.user_id}>
                      <td>{member.name}</td>
                      <td className="member-management-page__pii-cell">
                        <div className="member-management-page__email-actions">
                          <MaskedPiiField
                            field={PII_FIELD.EMAIL}
                            value={member.email}
                            targetUserId={member.user_id}
                            targetName={member.name}
                            context="list"
                          />
                          <button
                            type="button"
                            className="member-management-page__link-button"
                            onClick={() => setLinkModalMember(member)}
                          >
                            추가 계정
                            {Number(member.linked_accounts_count) > 0
                              ? ` (${member.linked_accounts_count})`
                              : ''}
                          </button>
                        </div>
                      </td>
                      <td>{member.username}</td>
                      <td className="member-management-page__pii-cell">
                        <MaskedPiiField
                          field={PII_FIELD.PHONE}
                          value={member.phone}
                          targetUserId={member.user_id}
                          targetName={member.name}
                          context="list"
                        />
                      </td>
                      <td>
                        <span className={`member-management-page__role member-management-page__role--${member.role}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td>{formatBoardDate(member.created_at)}</td>
                      <td>
                        <div className="member-management-page__actions">
                          <button
                            type="button"
                            className="member-management-page__action-button"
                            onClick={() => handleOpenDetail(member)}
                          >
                            정보보기
                          </button>
                          {canChangeRole && (
                            <button
                              type="button"
                              className="member-management-page__action-button"
                              onClick={() => {
                                setRoleError('')
                                setRoleModal({
                                  userId: member.user_id,
                                  name: member.name,
                                  currentRole: memberRole,
                                  nextRole: memberRole === USER_ROLES.MEMBER
                                    ? USER_ROLES.MANAGER
                                    : memberRole === USER_ROLES.MANAGER
                                      ? USER_ROLES.ADMIN
                                      : USER_ROLES.MEMBER,
                                })
                              }}
                            >
                              권한 변경
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="member-management-page__action-button member-management-page__action-button--danger"
                              onClick={() => {
                                setDeleteError('')
                                setDeleteModal({
                                  userId: member.user_id,
                                  name: member.name,
                                  roleLabel: getRoleLabel(member.role),
                                })
                              }}
                            >
                              탈퇴
                            </button>
                          )}
                          {!canChangeRole && !canDelete && (
                            <span className="member-management-page__action-muted">변경 불가</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <MemberDetailModal
          isOpen={Boolean(detailModal)}
          loading={detailLoading}
          error={detailError}
          member={detailMember}
          linkedAccounts={linkedAccounts}
          linkedLoading={linkedLoading}
          linkedError={linkedError}
          unlinkingUserId={unlinkingUserId}
          onUnlink={handleUnlinkAccount}
          onClose={handleCloseDetail}
        />

        {linkModalMember ? (
          <AccountLinkModal
            key={linkModalMember.user_id}
            isOpen
            primaryMember={linkModalMember}
            onClose={() => setLinkModalMember(null)}
            onLinked={handleLinked}
          />
        ) : null}

        {roleModal ? (
          <div className="member-management-modal" role="presentation">
            <div
              className="member-management-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="member-role-modal-title"
            >
              <h2 id="member-role-modal-title" className="member-management-modal__title">
                권한 변경
              </h2>
              <p className="member-management-modal__message">
                {roleModal.name}님의 권한을 변경합니다. (현재: {getRoleLabel(roleModal.currentRole)})
              </p>
              {roleError ? (
                <p className="member-management-modal__status member-management-modal__status--error" role="alert">
                  {roleError}
                </p>
              ) : null}
              <label className="member-management-page__role-select-label" htmlFor="member-role-select">
                변경할 권한
              </label>
              <select
                id="member-role-select"
                className="member-management-page__role-select"
                value={roleModal.nextRole}
                onChange={(event) =>
                  setRoleModal((current) =>
                    current
                      ? {
                          ...current,
                          nextRole: event.target.value,
                        }
                      : current,
                  )
                }
                disabled={isSubmitting}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role} disabled={role === roleModal.currentRole}>
                    {getRoleLabel(role)}
                    {role === roleModal.currentRole ? ' (현재)' : ''}
                  </option>
                ))}
              </select>
              <div className="member-management-modal__actions">
                <button
                  type="button"
                  className="member-management-modal__button member-management-modal__button--secondary"
                  onClick={() => {
                    if (!isSubmitting) {
                      setRoleError('')
                      setRoleModal(null)
                    }
                  }}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="member-management-modal__button member-management-modal__button--primary"
                  onClick={handleRoleConfirm}
                  disabled={isSubmitting || roleModal.nextRole === roleModal.currentRole}
                >
                  {isSubmitting ? '처리 중...' : '변경'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ConfirmModal
          isOpen={Boolean(deleteModal)}
          title="회원 탈퇴"
          message={
            deleteModal
              ? `${deleteModal.name}(${deleteModal.roleLabel}) 회원을 탈퇴 처리하시겠습니까?\n\n계정, 프로필 및 관련 데이터가 삭제되며 되돌릴 수 없습니다.`
              : ''
          }
          confirmLabel="탈퇴"
          isSubmitting={isSubmitting}
          errorMessage={deleteError}
          onCancel={() => {
            if (!isSubmitting) {
              setDeleteError('')
              setDeleteModal(null)
            }
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </MemberMypageLayout>
  )
}

export default MemberManagement
