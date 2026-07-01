import MemberMypageSidebar from '@/components/auth/MemberMypageSidebar'
import '@/components/layout/CategoryLayout.css'
import '@/components/auth/MemberMypageSidebar.css'

function MemberMypageLayout({ children }) {
  return (
    <div className="category-layout member-mypage-layout">
      <div className="category-layout__inner">
        <MemberMypageSidebar />
        <div className="category-layout__main member-mypage-layout__main">{children}</div>
      </div>
    </div>
  )
}

export default MemberMypageLayout
