import api from './api.js'

export async function fetchConversation(requestId) {
  const response = await api.get(`/requests/${requestId}/messages`)
  return response.data ?? []
}

export async function sendMessage(requestId, content) {
  const response = await api.post(`/requests/${requestId}/messages`, { content })
  return response.data
}
