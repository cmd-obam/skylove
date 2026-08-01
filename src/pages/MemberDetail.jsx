import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MemberDetailSections from '@/components/auth/MemberDetailSections'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { fetchLinkedAccounts, unlinkMemberAccount } from '@/services/auth/accountLinks'
import { fetchMemberDetailForSuperAdmin } from '@/services/auth/memberManagement'
import '@/pages/MemberManagement.css'

function MemberDetail() {
  const { userId } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const [linkedLoading, setLinkedLoading] = useState(false)
  const [linkedError, setLinkedError] = useState('')
  const [unlinkingUserId, setUnlinkingUserId] = useState('')

  const loadLinkedAccounts = useCallback(async (targetUserId) => {
    if (!targetUserId) {
      setLinkedAccounts([])
      return
    }

    setLinkedLoading(true)
    setLinkedError('')

    const result = await fetchLinkedAccounts(targetUserId)

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

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const result = await fetchMemberDetailForSuperAdmin(userId)

      if (!mounted) {
        return
      }

      if (!result.success || !result.member) {
        setError(result.message || '회원을 찾을 수 없습니다.')
        setMember(null)
        setLoading(false)
        return
      }

      setMember(result.member)
      setError('')
      setLoading(false)
      void loadLinkedAccounts(userId)
    }

    load()

    return () => {
      mounted = false
    }
  }, [loadLinkedAccounts, userId])

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
    await loadLinkedAccounts(userId)
  }

  return (
    <MemberMypageLayout>
      <div className="member-management-page">
        <header className="member-management-page__header">
          <h1 className="member-management-page__title">회원 상세정보</h1>
          <p className="member-management-page__subtitle">
            <Link to="/member/management">← 회원관리로 돌아가기</Link>
          </p>
        </header>

        {loading ? (
          <p className="member-management-page__empty">불러오는 중...</p>
        ) : error ? (
          <p className="member-management-page__feedback member-management-page__feedback--error">{error}</p>
        ) : (
          <div className="member-management-page__detail-panel">
            <MemberDetailSections
              member={member}
              linkedAccounts={linkedAccounts}
              linkedLoading={linkedLoading}
              linkedError={linkedError}
              unlinkingUserId={unlinkingUserId}
              onUnlink={handleUnlinkAccount}
            />
          </div>
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default MemberDetail
