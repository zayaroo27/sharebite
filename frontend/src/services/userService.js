import api from './api.js'

export async function fetchPublicUserProfile(userId) {
  const response = await api.get(`/users/${userId}/public-profile`)
  return response.data
}
