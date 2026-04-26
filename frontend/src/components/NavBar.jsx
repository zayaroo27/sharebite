import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'
import Avatar from './Avatar.jsx'
import '../styles/navbar.css'

function NavBar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { unreadMessageCount, unreadAlertCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const role = user?.role

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    setIsMobileMenuOpen(false)
    navigate('/login')
  }

  const getDashboardLink = () => {
    if (role === 'DONOR') return { to: '/dashboard/donor', label: 'Donor Dashboard' }
    if (role === 'RECIPIENT') return { to: '/dashboard/recipient', label: 'Recipient Dashboard' }
    if (role === 'ADMIN') return { to: '/dashboard/admin', label: 'Admin Dashboard' }
    return null
  }

  const dashboardLink = getDashboardLink()

  const navLinkClass = ({ isActive }) => (
    isActive ? 'navbar__link navbar__link--active' : 'navbar__link'
  )
  const mobileNavLinkClass = ({ isActive }) => (
    isActive ? 'navbar__mobile-link navbar__mobile-link--active' : 'navbar__mobile-link'
  )

  const messageBadgeText = unreadMessageCount > 99 ? '99+' : String(unreadMessageCount)
  const alertBadgeText = unreadAlertCount > 99 ? '99+' : String(unreadAlertCount)
  const avatarName = user?.displayName || user?.username || user?.email || 'User'
  const notificationsPageActive = location.pathname === '/notifications'

  return (
    <header className={`navbar ${isMobileMenuOpen ? 'navbar--menu-open' : ''}`.trim()}>
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
            {isAuthenticated && role !== 'ADMIN' && (
              <NavLink to="/messages" className={navLinkClass}>
                <span className="navbar__link-with-badge">
                  <span>Messages</span>
                  {unreadMessageCount > 0 && <span className="navbar__nav-badge">{messageBadgeText}</span>}
                </span>
              </NavLink>
            )}
          </nav>
        </div>

        <button
          type="button"
          className="navbar__menu-toggle"
          aria-expanded={isMobileMenuOpen}
          aria-controls="sharebite-mobile-navigation"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span className="navbar__menu-toggle-line" aria-hidden="true" />
          <span className="navbar__menu-toggle-line" aria-hidden="true" />
          <span className="navbar__menu-toggle-line" aria-hidden="true" />
        </button>

        <div className="navbar__right">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className={`navbar__bell-button ${notificationsPageActive ? 'navbar__bell-button--active' : ''}`.trim()}
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
                aria-current={notificationsPageActive ? 'page' : undefined}
              >
                <svg
                  className="navbar__bell-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M15 18H9m9-1V11a6 6 0 1 0-12 0v6l-2 2h16l-2-2Zm-7 3h2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {unreadAlertCount > 0 && <span className="navbar__bell-badge">{alertBadgeText}</span>}
              </button>

              <button
                type="button"
                className="navbar__profile-pill"
                onClick={() => navigate('/profile')}
              >
                <Avatar
                  className="navbar__avatar"
                  name={avatarName}
                  imageUrl={user?.profileImageUrl}
                  size={28}
                />
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

      <div
        id="sharebite-mobile-navigation"
        className={`navbar__mobile-panel ${isMobileMenuOpen ? 'navbar__mobile-panel--open' : ''}`.trim()}
      >
        <nav className="navbar__mobile-links" aria-label="Mobile navigation">
          <NavLink to="/listings" className={mobileNavLinkClass}>
            Browse Food
          </NavLink>
          {isAuthenticated && dashboardLink && (
            <NavLink to={dashboardLink.to} className={mobileNavLinkClass}>
              {dashboardLink.label}
            </NavLink>
          )}
          {isAuthenticated && role !== 'ADMIN' && (
            <NavLink to="/messages" className={mobileNavLinkClass}>
              <span className="navbar__mobile-link-content">
                <span>Messages</span>
                {unreadMessageCount > 0 && <span className="navbar__nav-badge">{messageBadgeText}</span>}
              </span>
            </NavLink>
          )}
          {isAuthenticated && (
            <button
              type="button"
              className={`navbar__mobile-action ${notificationsPageActive ? 'navbar__mobile-action--active' : ''}`.trim()}
              onClick={() => navigate('/notifications')}
            >
              <span>Notifications</span>
              {unreadAlertCount > 0 && <span className="navbar__bell-badge navbar__bell-badge--inline">{alertBadgeText}</span>}
            </button>
          )}
        </nav>

        <div className="navbar__mobile-footer">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="navbar__mobile-profile"
                onClick={() => navigate('/profile')}
              >
                <Avatar
                  className="navbar__avatar"
                  name={avatarName}
                  imageUrl={user?.profileImageUrl}
                  size={32}
                />
                <span className="navbar__mobile-profile-copy">
                  <strong>{avatarName}</strong>
                  <span>Open profile</span>
                </span>
              </button>
              <button
                type="button"
                className="navbar__mobile-logout btn btn-ghost"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="navbar__mobile-auth">
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
