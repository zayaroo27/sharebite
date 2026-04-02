import api from './api.js'

export async function fetchDonorDashboard() {
  const [listingsResponse, requestsResponse] = await Promise.all([
    api.get('/listings/my'),
    api.get('/requests/for-my-listings'),
  ])

  return {
    listings: listingsResponse.data ?? [],
    requests: requestsResponse.data ?? [],
  }
}

export async function approveRequest(requestId) {
  const response = await api.patch(`/requests/${requestId}/approve`)
  return response.data
}

export async function rejectRequest(requestId) {
  const response = await api.patch(`/requests/${requestId}/reject`)
  return response.data
}

export async function completeRequest(requestId) {
  const response = await api.patch(`/requests/${requestId}/complete`)
  return response.data
}
