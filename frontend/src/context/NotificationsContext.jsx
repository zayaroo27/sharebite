import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js'
import { AuthContext } from './AuthContext.jsx'

export const NotificationsContext = createContext(null)

const POLL_INTERVAL_MS = 10000
const MESSAGE_TYPE = 'NEW_MESSAGE'

function normalizeNotification(notification) {
  if (!notification) return null

  const type = String(notification.type || '').toUpperCase()

  return {
    ...notification,
    type,
    read: Boolean(notification.read ?? notification.isRead),
    date: notification.date ?? notification.createdAt ?? null,
  }
}

function normalizeNotificationsList(data) {
  const list = Array.isArray(data) ? data : data?.items ?? []
  return list.map(normalizeNotification).filter(Boolean)
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const { isAuthenticated } = useContext(AuthContext)

  const replaceNotifications = useCallback((nextValue) => {
    if (typeof nextValue === 'function') {
      setNotifications((prev) => normalizeNotificationsList(nextValue(prev)))
      return
    }

    setNotifications(normalizeNotificationsList(nextValue))
  }, [])

  const refreshNotifications = useCallback(async () => {
    const data = await fetchNotifications()
    const normalized = normalizeNotificationsList(data)
    setNotifications(normalized)
    return normalized
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      return undefined
    }

    let active = true

    const loadNotifications = async () => {
      try {
        const data = await fetchNotifications()
        if (!active) return
        setNotifications(normalizeNotificationsList(data))
      } catch {
        // Keep previous value if fetch fails
      }
    }

    loadNotifications()
    const intervalId = window.setInterval(loadNotifications, POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const unreadMessageCount = useMemo(
    () => notifications.filter((n) => !n.read && n.type === MESSAGE_TYPE).length,
    [notifications],
  )

  const unreadAlertCount = useMemo(
    () => notifications.filter((n) => !n.read && n.type !== MESSAGE_TYPE).length,
    [notifications],
  )

  const markOneAsRead = async (id) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
  }

  const markAllAsRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markMessageNotificationsAsRead = async () => {
    let current = notifications

    if (current.length === 0) {
      try {
        const fetched = await fetchNotifications()
        current = normalizeNotificationsList(fetched)
        setNotifications(current)
      } catch {
        return
      }
    }

    const toMark = current.filter(
      (n) => !n.read && n.type === MESSAGE_TYPE,
    )

    if (toMark.length === 0) return

    const ids = new Set(toMark.map((n) => n.id))
    setNotifications((prev) =>
      prev.map((n) => (ids.has(n.id) ? { ...n, read: true } : n)),
    )

    await Promise.all(
      toMark.map((n) => markNotificationRead(n.id).catch(() => null)),
    )
  }

  const value = useMemo(
    () => ({
      notifications,
      setNotifications: replaceNotifications,
      refreshNotifications,
      unreadCount,
      unreadMessageCount,
      unreadAlertCount,
      markOneAsRead,
      markAllAsRead,
      markMessageNotificationsAsRead,
    }),
    [
      notifications,
      replaceNotifications,
      refreshNotifications,
      unreadCount,
      unreadMessageCount,
      unreadAlertCount,
    ],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
