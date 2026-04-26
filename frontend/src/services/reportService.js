import api from './api.js'

export async function reportListing(listingId, payload) {
  const {
    reason,
    details = '',
    policyCategory = 'OTHER',
    severity = 'MEDIUM',
  } = payload

  await api.post('/reports', {
    type: 'LISTING',
    reason,
    policyCategory,
    severity,
    details,
    listingId,
    requestId: null,
    reportedMessageId: null,
  })
}

export async function reportRequest(requestId, payload) {
  const {
    reason,
    details = '',
    policyCategory = 'OTHER',
    severity = 'MEDIUM',
    reportedMessageId = null,
  } = payload

  await api.post('/reports', {
    type: 'REQUEST',
    reason,
    policyCategory,
    severity,
    details,
    listingId: null,
    requestId,
    reportedMessageId,
  })
}
