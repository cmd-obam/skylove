import { Outlet } from 'react-router-dom'
import AdminRequiredModal from '@/components/auth/AdminRequiredModal'
import { useAdminRouteGuard } from '@/hooks/useAdminRouteGuard'

function AdminRoute({ children }) {
  const { loading, isAllowed, goHome } = useAdminRouteGuard()

  if (loading) {
    return null
  }

  if (!isAllowed) {
    return <AdminRequiredModal isOpen onConfirm={goHome} />
  }

  return children ?? <Outlet />
}

export default AdminRoute
