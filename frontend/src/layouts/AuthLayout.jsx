import { Outlet } from 'react-router-dom'
import '../styles/layouts.css'
import '../styles/auth-pages.css'

function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-shell__backdrop" aria-hidden="true" />
      <Outlet />
    </div>
  )
}

export default AuthLayout
