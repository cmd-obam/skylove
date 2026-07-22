import { Outlet } from 'react-router-dom'
import AccessDeniedModal from '@/components/auth/AccessDeniedModal'
import { useCmsAdminRouteGuard } from '@/hooks/useCmsAdminRouteGuard'

function CmsAdminRoute({ children }) {
  const { loading, isAllowed, goHome } = useCmsAdminRouteGuard()

  if (loading) {
    return null
  }

  if (!isAllowed) {
    return <AccessDeniedModal isOpen onConfirm={goHome} />
  }

  return children ?? <Outlet />
}

export default CmsAdminRoute
