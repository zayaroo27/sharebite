import '../styles/notifications.css'

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

  const { id, title, message, date, read } = notification

  return (
    <article
      className={`notification-item ${
        read ? 'notification-item--read' : 'notification-item--unread'
      }`.trim()}
    >
      {!read && <span className="notification-item__unread-dot" aria-hidden="true" />}
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
