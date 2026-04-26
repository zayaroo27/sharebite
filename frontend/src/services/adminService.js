import api from './api.js'

export async function fetchAdminDashboard() {
  const [usersResponse, statsResponse, categoriesResponse, reportsResponse] = await Promise.allSettled([
    api.get('/admin/users'),
    api.get('/admin/stats'),
    api.get('/categories'),
    api.get('/admin/reports'),
  ])

  const usersFailed = usersResponse.status === 'rejected'
  const statsFailed = statsResponse.status === 'rejected'

  if (usersFailed && statsFailed) {
    throw usersResponse.reason || statsResponse.reason || new Error('Unable to load admin dashboard')
  }

  const sectionErrors = []
  if (usersFailed) sectionErrors.push('users')
  if (statsFailed) sectionErrors.push('stats')
  if (categoriesResponse.status === 'rejected') sectionErrors.push('categories')
  if (reportsResponse.status === 'rejected') sectionErrors.push('reports')

  return {
    users: usersResponse.status === 'fulfilled' ? (usersResponse.value.data ?? []) : [],
    categories: categoriesResponse.status === 'fulfilled' ? (categoriesResponse.value.data ?? []) : [],
    reports: reportsResponse.status === 'fulfilled' ? (reportsResponse.value.data ?? []) : [],
    stats: statsResponse.status === 'fulfilled' ? (statsResponse.value.data ?? null) : null,
    sectionErrors,
  }
}

export async function fetchAdminReport(reportId) {
  const response = await api.get(`/admin/reports/${reportId}`)
  return response.data
}

export async function suspendUser(userId) {
  const response = await api.patch(`/admin/users/${userId}/suspend`)
  return response.data
}

export async function reactivateUser(userId) {
  const response = await api.patch(`/admin/users/${userId}/activate`)
  return response.data
}

export async function deleteListing(listingId) {
  const response = await api.delete(`/admin/listings/${listingId}`)
  return response.data
}

export async function createCategory(payload) {
  const response = await api.post('/categories', payload)
  return response.data
}

export async function updateCategory(categoryId, payload) {
  const response = await api.put(`/categories/${categoryId}`, payload)
  return response.data
}

export async function deleteCategory(categoryId) {
  const response = await api.delete(`/categories/${categoryId}`)
  return response.data
}

export async function resolveReport(reportId, payload) {
  const response = await api.patch(`/admin/reports/${reportId}/resolve`, payload)
  return response.data
}

export async function dismissReport(reportId, payload) {
  const response = await api.patch(`/admin/reports/${reportId}/dismiss`, payload)
  return response.data
}
