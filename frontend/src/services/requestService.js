import api from './api.js'

export async function createRequest(listingId) {
  const response = await api.post(`/requests/${listingId}`)
  return response.data
}
