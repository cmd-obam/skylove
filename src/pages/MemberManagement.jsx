import { useCallback, useEffect, useState } from 'react'
import { FiUsers } from 'react-icons/fi'
import MemberDetailSections from '@/components/auth/MemberDetailSections'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
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
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './MemberManagement.css'

function ConfirmModal({ isOpen, title, message, confirmLabel, isSubmitting, onCancel, onConfirm }) {
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

function MemberDetailModal({ isOpen, loading, error, member, onClose }) {
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
            <MemberDetailSections member={member} />
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
  const [detailModal, setDetailModal] = useState(null)
  const [detailMember, setDetailMember] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  }

  const handleRoleConfirm = async () => {
    if (!roleModal) {
      return
    }

    setIsSubmitting(true)

    const result = await updateMemberRoleBySuperAdmin(roleModal.userId, roleModal.nextRole)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    setRoleModal(null)
    setIsSubmitting(false)
    await loadMembers(searchQuery)
    setFeedback({ type: 'success', message: result.message })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) {
      return
    }

    setIsSubmitting(true)

    const result = await deleteMemberBySuperAdmin(deleteModal.userId)

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message })
      setIsSubmitting(false)
      return
    }

    setDeleteModal(null)
    setIsSubmitting(false)
    await loadMembers(searchQuery)
    setFeedback({ type: 'success', message: result.message })
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
              <col className="member-management-page__col-role" />
              <col className="member-management-page__col-date" />
              <col className="member-management-page__col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">이메일</th>
                <th scope="col">권한</th>
                <th scope="col">가입일</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="member-management-page__empty">
                    불러오는 중...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="member-management-page__empty">
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
                      <td>{member.email}</td>
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
                              onClick={() =>
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
                              }
                            >
                              권한 변경
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="member-management-page__action-button member-management-page__action-button--danger"
                              onClick={() =>
                                setDeleteModal({
                                  userId: member.user_id,
                                  name: member.name,
                                  roleLabel: getRoleLabel(member.role),
                                })
                              }
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
          onClose={handleCloseDetail}
        />

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
          onCancel={() => {
            if (!isSubmitting) {
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
