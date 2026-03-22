import { Outlet } from 'react-router-dom'
import '../styles/layouts.css'

function AuthLayout() {
  return (
    <div className="auth-shell">
      <Outlet />
    </div>
  )
}

export default AuthLayout
