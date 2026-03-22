import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js'
import { AuthContext } from './AuthContext.jsx'

export const NotificationsContext = createContext(null)

const POLL_INTERVAL_MS = 10000

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated } = useContext(AuthContext)

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return undefined
    }

    let active = true

    const loadUnreadCount = async () => {
      try {
        const count = await fetchUnreadCount()
        if (!active) return
        setUnreadCount(count)
      } catch {
        // Keep previous value if fetch fails
      }
    }

    loadUnreadCount()
    const intervalId = window.setInterval(loadUnreadCount, POLL_INTERVAL_MS)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (notifications.length === 0) return
    setUnreadCount(notifications.filter((n) => !n.read).length)
  }, [notifications])

  const markOneAsRead = async (id) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markMessageNotificationsAsRead = async () => {
    let current = notifications

    if (current.length === 0) {
      try {
        const fetched = await fetchNotifications()
        current = Array.isArray(fetched) ? fetched : fetched?.items ?? []
        setNotifications(current)
      } catch {
        return
      }
    }

    const toMark = current.filter(
      (n) => !n.read && String(n.type || '').toUpperCase() === 'NEW_MESSAGE',
    )

    if (toMark.length === 0) return

    const ids = new Set(toMark.map((n) => n.id))
    setNotifications((prev) =>
      prev.map((n) => (ids.has(n.id) ? { ...n, read: true } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - toMark.length))

    await Promise.all(
      toMark.map((n) => markNotificationRead(n.id).catch(() => null)),
    )
  }

  const value = useMemo(
    () => ({
      notifications,
      setNotifications,
      unreadCount,
      markOneAsRead,
      markAllAsRead,
      markMessageNotificationsAsRead,
    }),
    [notifications, unreadCount],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
