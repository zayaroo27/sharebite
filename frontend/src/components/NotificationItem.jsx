import '../styles/notifications.css'

function getTypeDotClass(type) {
  const normalized = (type || '').toLowerCase()
  if (normalized === 'success')
    return 'notification-item__type-dot notification-item__type-dot--success'
  if (normalized === 'warning')
    return 'notification-item__type-dot notification-item__type-dot--warning'
  if (normalized === 'error')
    return 'notification-item__type-dot notification-item__type-dot--error'
  return 'notification-item__type-dot notification-item__type-dot--info'
}

function formatNotificationDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function NotificationItem({ notification, onMarkRead }) {
  if (!notification) return null

  const { id, title, message, type, date, read } = notification

  return (
    <article
      className={`notification-item ${
        read ? '' : 'notification-item--unread'
      }`.trim()}
    >
      <span className={getTypeDotClass(type)} />
      <div className="notification-item__body">
        <div className="notification-item__title-row">
          <h2 className="notification-item__title">{title}</h2>
          {date && <span className="notification-item__date">{formatNotificationDate(date)}</span>}
        </div>
        {message && (
          <p className="notification-item__message">{message}</p>
        )}
        <div className="notification-item__footer">
          <span className="notification-item__status">
            {read ? 'Read' : 'Unread'}
          </span>
          {!read && onMarkRead && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onMarkRead(id)}
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default NotificationItem
