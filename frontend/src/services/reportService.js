import api from './api.js'

export async function reportListing(listingId, reason, details = '') {
  await api.post('/reports', {
    type: 'LISTING',
    reason,
    details,
    listingId,
    requestId: null,
  })
}

export async function reportRequest(requestId, reason, details = '') {
  await api.post('/reports', {
    type: 'REQUEST',
    reason,
    details,
    listingId: null,
    requestId,
  })
}
