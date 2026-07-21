import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MemberDetailSections from '@/components/auth/MemberDetailSections'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { fetchMemberDetailForSuperAdmin } from '@/services/auth/memberManagement'
import '@/pages/MemberManagement.css'

function MemberDetail() {
  const { userId } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    }

    load()

    return () => {
      mounted = false
    }
  }, [userId])

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
            <MemberDetailSections member={member} />
          </div>
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default MemberDetail
