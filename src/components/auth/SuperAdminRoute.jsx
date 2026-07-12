import { Outlet } from 'react-router-dom'
import AccessDeniedModal from '@/components/auth/AccessDeniedModal'
import { useSuperAdminRouteGuard } from '@/hooks/useSuperAdminRouteGuard'

function SuperAdminRoute({ children }) {
  const { loading, isAllowed, goMypage } = useSuperAdminRouteGuard()

  if (loading) {
    return null
  }

  if (!isAllowed) {
    return <AccessDeniedModal isOpen onConfirm={goMypage} />
  }

  return children ?? <Outlet />
}

export default SuperAdminRoute
