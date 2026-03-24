import { useEffect, useState } from 'react'
import { useNotifications } from '../hooks/useNotifications.js'
import Button from '../components/Button.jsx'
import '../styles/notifications.css'

function getTypeDotClass(type) {
  const normalized = (type || '').toLowerCase()
  if (normalized === 'success') return 'notification-item__type-dot notification-item__type-dot--success'
  if (normalized === 'warning') return 'notification-item__type-dot notification-item__type-dot--warning'
  if (normalized === 'error') return 'notification-item__type-dot notification-item__type-dot--error'
  return 'notification-item__type-dot notification-item__type-dot--info'
}

function NotificationsPage() {
  const { notifications, refreshNotifications, markOneAsRead, markAllAsRead } =
    useNotifications()
  const [loading, setLoading] = useState(notifications.length === 0)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        await refreshNotifications()
      } catch (err) {
        setError('We could not load your notifications right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [refreshNotifications])

  const unreadExists = notifications.some((n) => !n.read)

  const handleMarkOne = async (id) => {
    try {
      await markOneAsRead(id)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to mark this notification as read right now.')
    }
  }

  const handleMarkAll = async () => {
    try {
      await markAllAsRead()
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Unable to mark all notifications as read right now.')
    }
  }

  return (
    <section className="notifications-page">
      <div className="notifications-page__header">
        <div className="notifications-page__title-group">
          <h1>Notifications</h1>
          <p className="notifications-page__subtitle">
            A calm overview of your ShareBite updates – from new approvals to
            important messages.
          </p>
        </div>
        <div className="notifications-page__actions">
          <Button
            variant="outline"
            type="button"
            onClick={handleMarkAll}
            disabled={!unreadExists}
          >
            Mark all as read
          </Button>
        </div>
      </div>

      {loading && <p>Loading notifications…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && notifications.length === 0 && (
        <p className="notifications-page__subtitle">
          You have no notifications yet. As you start using ShareBite, they
          will appear here.
        </p>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-item ${
                notification.read ? '' : 'notification-item--unread'
              }`.trim()}
            >
              <span className={getTypeDotClass(notification.type)} />
              <div className="notification-item__body">
                <div className="notification-item__title-row">
                  <h2 className="notification-item__title">
                    {notification.title}
                  </h2>
                  {notification.date && (
                    <span className="notification-item__date">
                      {notification.date}
                    </span>
                  )}
                </div>
                {notification.message && (
                  <p className="notification-item__message">
                    {notification.message}
                  </p>
                )}
                <div className="notification-item__footer">
                  <span className="notification-item__status">
                    {notification.read ? 'Read' : 'Unread'}
                  </span>
                  {!notification.read && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => handleMarkOne(notification.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default NotificationsPage
