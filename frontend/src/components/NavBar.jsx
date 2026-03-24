import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'
import '../styles/navbar.css'

function NavBar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { unreadMessageCount, unreadAlertCount } = useNotifications()
  const navigate = useNavigate()

  const role = user?.role

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getDashboardLink = () => {
    if (role === 'DONOR') return { to: '/dashboard/donor', label: 'Donor Dashboard' }
    if (role === 'RECIPIENT') return { to: '/dashboard/recipient', label: 'Recipient Dashboard' }
    if (role === 'ADMIN') return { to: '/dashboard/admin', label: 'Admin' }
    return null
  }

  const dashboardLink = getDashboardLink()

  const navLinkClass = ({ isActive }) => (
    isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
  )

  const messageBadgeText = unreadMessageCount > 99 ? '99+' : String(unreadMessageCount)
  const alertBadgeText = unreadAlertCount > 99 ? '99+' : String(unreadAlertCount)
  const initials = (user?.username || user?.email || 'U').slice(0, 1).toUpperCase()

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <div className="navbar__brand">
            <Link to="/">
              <span className="navbar__logo-mark" aria-hidden="true">
                🥗
              </span>
              <span className="navbar__logo-text">ShareBite</span>
            </Link>
          </div>

          <nav className="navbar__links">
            <NavLink to="/listings" className={navLinkClass}>
              Browse Food
            </NavLink>
            {isAuthenticated && dashboardLink && (
              <NavLink to={dashboardLink.to} className={navLinkClass}>
                {dashboardLink.label}
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/messages" className={navLinkClass}>
                <span className="navbar__link-with-badge">
                  <span>Messages</span>
                  {unreadMessageCount > 0 && <span className="navbar__nav-badge">{messageBadgeText}</span>}
                </span>
              </NavLink>
            )}
          </nav>
        </div>

        <div className="navbar__right">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="navbar__bell-button"
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
              >
                <span aria-hidden="true">🔔</span>
                {unreadAlertCount > 0 && <span className="navbar__bell-badge">{alertBadgeText}</span>}
              </button>

              <button
                type="button"
                className="navbar__profile-pill"
                onClick={() => navigate('/profile')}
              >
                <span className="navbar__avatar" aria-hidden="true">{initials}</span>
                <span>Profile</span>
              </button>
              <button
                type="button"
                className="navbar__logout-link"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="navbar__auth-links">
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default NavBar
