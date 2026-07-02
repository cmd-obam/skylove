import { Navigate, useLocation } from 'react-router-dom'

function EmailConfirmSuccess() {
  const location = useLocation()

  return <Navigate to={`/auth/callback${location.search}${location.hash}`} replace />
}

export default EmailConfirmSuccess
