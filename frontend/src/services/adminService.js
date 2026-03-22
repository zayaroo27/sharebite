import api from './api.js'

export async function fetchAdminDashboard() {
  const [usersResponse, statsResponse, categoriesResponse] = await Promise.all([
    api.get('/admin/users'),
    api.get('/admin/stats'),
    api.get('/categories'),
  ])

  return {
    users: usersResponse.data ?? [],
    categories: categoriesResponse.data ?? [],
    listingsForModeration: [],
    stats: statsResponse.data ?? null,
  }
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
