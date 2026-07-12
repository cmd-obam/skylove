import LoginRequiredModal from '@/components/auth/LoginRequiredModal'
import { useMemberRouteGuard } from '@/hooks/useMemberRouteGuard'

function MemberRoute({ children }) {
  const { loading, isAllowed, goToLogin } = useMemberRouteGuard()

  if (loading) {
    return null
  }

  if (!isAllowed) {
    return <LoginRequiredModal isOpen onLogin={goToLogin} />
  }

  return children
}

export default MemberRoute
