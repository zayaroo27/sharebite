import api from './api.js'

export async function fetchNotifications() {
  const response = await api.get('/notifications')
  return response.data
}

export async function fetchUnreadCount() {
  const response = await api.get('/notifications/unread-count')
  return Number(response.data ?? 0)
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`)
  return response.data
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all')
  return response.data
}
