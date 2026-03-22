import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role
    const isAllowed = userRole && allowedRoles.includes(userRole)

    if (!isAllowed) {
      return <Navigate to="/not-authorized" replace />
    }
  }

  return children
}

export default ProtectedRoute
