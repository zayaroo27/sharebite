import api from './api.js'

export async function fetchRecipientDashboard() {
  const [listingsResponse, requestsResponse] = await Promise.all([
    api.get('/listings'),
    api.get('/requests/my'),
  ])

  return {
    recentListings: listingsResponse.data ?? [],
    requests: requestsResponse.data ?? [],
  }
}

export async function cancelMyRequest(requestId) {
  const response = await api.patch(`/requests/${requestId}/cancel`)
  return response.data
}
