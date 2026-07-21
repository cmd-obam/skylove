import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { fetchMemberDetailForSuperAdmin } from '@/services/admin/contentManagement'
import { getRoleLabel } from '@/services/auth/roles'
import { formatBoardDate } from '@/utils/formatBoardDate'
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
          <div className="member-management-page__table-wrap">
            <table className="member-management-page__table">
              <tbody>
                <tr>
                  <th scope="row">이름</th>
                  <td>{member.name}</td>
                </tr>
                <tr>
                  <th scope="row">아이디</th>
                  <td>{member.username}</td>
                </tr>
                <tr>
                  <th scope="row">이메일</th>
                  <td>{member.email}</td>
                </tr>
                <tr>
                  <th scope="row">전화</th>
                  <td>{member.phone || '-'}</td>
                </tr>
                <tr>
                  <th scope="row">권한</th>
                  <td>{getRoleLabel(member.role)}</td>
                </tr>
                <tr>
                  <th scope="row">가입일</th>
                  <td>{formatBoardDate(member.created_at)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MemberMypageLayout>
  )
}

export default MemberDetail
