import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cancelMyRequest, confirmReceivedRequest, fetchRecipientDashboard } from '../services/recipientService.js'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'
import '../styles/recipient-dashboard.css'

function getStatusClass(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'approved') return 'recipient-dashboard__status recipient-dashboard__status--approved'
  if (normalized === 'pending') return 'recipient-dashboard__status recipient-dashboard__status--pending'
  if (normalized === 'rejected') return 'recipient-dashboard__status recipient-dashboard__status--rejected'
  if (normalized === 'canceled') return 'recipient-dashboard__status recipient-dashboard__status--canceled'
  if (normalized === 'completed') return 'recipient-dashboard__status recipient-dashboard__status--completed'
  return 'recipient-dashboard__status recipient-dashboard__status--default'
}

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-US').format(date)
}

function hasDonorConfirmedCompletion(request) {
  return Boolean(request?.donorCompletedAt)
}

function hasRecipientConfirmedCompletion(request) {
  return Boolean(request?.recipientCompletedAt)
}

function getHistoryDate(request) {
  return request.completedDate
    || request.recipientCompletedAt
    || request.donorCompletedAt
    || request.decisionDate
    || request.requestDate
    || request.requestedAt
}

function RecipientDashboardPage() {
  const [recentListings, setRecentListings] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [cancelingRequestId, setCancelingRequestId] = useState(null)
  const [confirmingRequestId, setConfirmingRequestId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loadDashboard = async ({ preserveLoadingState = false } = {}) => {
    if (!preserveLoadingState) {
      setLoading(true)
    }

    try {
      const data = await fetchRecipientDashboard()
      setRecentListings(data.recentListings ?? [])
      setMyRequests(data.requests ?? [])
      setError('')
    } catch (err) {
      if (!preserveLoadingState) {
        setError('We could not load your dashboard right now. Please try again.')
      } else {
        // eslint-disable-next-line no-alert
        alert(err?.response?.data?.message || 'Unable to refresh your requests right now.')
      }
    } finally {
      if (!preserveLoadingState) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const activeRequests = myRequests.filter((request) => {
    const status = String(request.status || '').toUpperCase()
    return status === 'PENDING' || status === 'APPROVED'
  })

  const requestHistory = [...myRequests]
    .filter((request) => {
      const status = String(request.status || '').toUpperCase()
      return status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELED'
    })
    .sort((left, right) => new Date(getHistoryDate(right)).getTime() - new Date(getHistoryDate(left)).getTime())

  const handleViewListing = (id) => {
    if (!id) return
    navigate(`/listings/${id}`)
  }

  const handleCancelRequest = async (requestId) => {
    if (!requestId) return
    if (!window.confirm('Cancel this request?')) return

    setCancelingRequestId(requestId)
    try {
      const updated = await cancelMyRequest(requestId)
      setMyRequests((prev) => prev.map((item) => (
        (item.requestId ?? item.id) === requestId
          ? { ...item, ...updated, id: item.id, requestId: item.requestId ?? item.id }
          : item
      )))
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.response?.data?.message || 'Unable to cancel this request right now.')
    } finally {
      setCancelingRequestId(null)
    }
  }

  const handleConfirmReceived = async (requestId) => {
    if (!requestId) return
    if (!window.confirm('Confirm that you received this donation?')) return

    setConfirmingRequestId(requestId)
    try {
      await confirmReceivedRequest(requestId)
      await loadDashboard({ preserveLoadingState: true })
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.response?.data?.message || 'Unable to confirm receipt right now.')
    } finally {
      setConfirmingRequestId(null)
    }
  }

  if (loading) {
    return (
      <section className="recipient-dashboard">
        <p>Loading your dashboard…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="recipient-dashboard">
        <p className="form-error">{error}</p>
      </section>
    )
  }

  return (
    <section className="recipient-dashboard">
      <div className="recipient-dashboard__header">
        <div className="recipient-dashboard__title-group">
          <h1 className="recipient-dashboard__page-title">Recipient Dashboard</h1>
          <p className="recipient-dashboard__subtitle">Browse available food and manage your requests</p>
        </div>
      </div>

      <article>
        <h2 className="recipient-dashboard__section-title">My Requests</h2>
        <div className="recipient-dashboard__table-wrap">
          {activeRequests.length === 0 ? (
            <div className="recipient-dashboard__empty">
              {myRequests.length === 0
                ? 'You have not made any requests yet.'
                : 'You have no active requests right now. Past outcomes are shown in your request history below.'}
            </div>
          ) : (
            <table className="recipient-dashboard__table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Request Date</th>
                  <th>Pickup Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Receipt Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {activeRequests.map((request) => {
                  const status = String(request.status || '').toLowerCase()
                  const canView = status === 'approved' || status === 'completed'
                  const canCancel = status === 'pending'
                  const donorConfirmed = hasDonorConfirmedCompletion(request)
                  const recipientConfirmed = hasRecipientConfirmedCompletion(request)
                  const canConfirmReceived = status === 'approved' && donorConfirmed && !recipientConfirmed
                  const waitingForDonor = status === 'approved' && !donorConfirmed
                  const waitingForRecipient = status === 'approved' && donorConfirmed && recipientConfirmed
                  const isConfirming = confirmingRequestId === (request.requestId ?? request.id)

                  return (
                    <tr key={request.requestId ?? request.id}>
                      <td data-label="Food Item">{request.listingTitle || '—'}</td>
                      <td data-label="Request Date">{formatDate(request.requestDate || request.requestedAt)}</td>
                      <td data-label="Pickup Date">{formatDate(request.pickupDate || request.decisionDate)}</td>
                      <td data-label="Status">
                        <span className={getStatusClass(request.status)}>
                          {request.status || 'Unknown'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="recipient-dashboard__actions">
                          {canView && (
                            <button
                              type="button"
                              className="recipient-dashboard__action-link recipient-dashboard__action-link--view"
                              onClick={() => handleViewListing(request.listingId)}
                            >
                              View Details
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              className="recipient-dashboard__action-link recipient-dashboard__action-link--cancel"
                              onClick={() => handleCancelRequest(request.requestId ?? request.id)}
                              disabled={cancelingRequestId === (request.requestId ?? request.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                      <td data-label="Receipt Confirmation">
                        <div className="recipient-dashboard__confirmation-cell">
                          {canConfirmReceived && (
                            <button
                              type="button"
                              className="recipient-dashboard__action-link recipient-dashboard__action-link--confirm"
                              onClick={() => handleConfirmReceived(request.requestId ?? request.id)}
                              disabled={isConfirming}
                            >
                              {isConfirming ? 'Confirming...' : 'Confirm received'}
                            </button>
                          )}
                          {waitingForDonor && (
                            <span className="recipient-dashboard__action-note">
                              Waiting for donor handover confirmation
                            </span>
                          )}
                          {waitingForRecipient && (
                            <span className="recipient-dashboard__action-note">
                              Receipt already confirmed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </article>

      <article>
        <h2 className="recipient-dashboard__section-title">Request History</h2>
        <div className="recipient-dashboard__table-wrap">
          {requestHistory.length === 0 ? (
            <div className="recipient-dashboard__empty">
              Past requests will appear here after they are completed, rejected, or canceled.
            </div>
          ) : (
            <table className="recipient-dashboard__table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Request Date</th>
                  <th>Outcome Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Receipt Confirmation</th>
                </tr>
              </thead>
              <tbody>
                {requestHistory.map((request) => {
                  const status = String(request.status || '').toLowerCase()
                  const canView = Boolean(request.listingId)
                  const receiptText =
                    status === 'completed'
                      ? 'Received'
                      : status === 'rejected'
                        ? 'Not fulfilled'
                        : 'Canceled'

                  return (
                    <tr key={request.requestId ?? request.id}>
                      <td data-label="Food Item">{request.listingTitle || '—'}</td>
                      <td data-label="Request Date">{formatDate(request.requestDate || request.requestedAt)}</td>
                      <td data-label="Outcome Date">{formatDate(getHistoryDate(request))}</td>
                      <td data-label="Status">
                        <span className={getStatusClass(request.status)}>
                          {request.status || 'Unknown'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="recipient-dashboard__actions">
                          {canView && (
                            <button
                              type="button"
                              className="recipient-dashboard__action-link recipient-dashboard__action-link--view"
                              onClick={() => handleViewListing(request.listingId)}
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </td>
                      <td data-label="Receipt Confirmation">
                        <div className="recipient-dashboard__confirmation-cell">
                          <span className="recipient-dashboard__action-note">{receiptText}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </article>

      <article>
        <div className="recipient-dashboard__section-row">
          <h2 className="recipient-dashboard__section-title">Recent Listings</h2>
          <Link to="/listings" className="recipient-dashboard__view-all-link">View all listings →</Link>
        </div>

        {recentListings.length === 0 ? (
          <div className="recipient-dashboard__empty">No listings available right now.</div>
        ) : (
          <div className="recipient-dashboard__cards-grid">
            {recentListings.slice(0, 4).map((listing) => (
              <article
                key={listing.id}
                className="recipient-listing-card"
                onClick={() => handleViewListing(listing.id)}
              >
                <div className="recipient-listing-card__image-wrap">
                  <img
                    src={listing.imageUrl || LISTING_PLACEHOLDER_IMAGE}
                    alt={listing.title}
                    onError={(event) => {
                      event.currentTarget.src = LISTING_PLACEHOLDER_IMAGE
                    }}
                  />
                </div>
                <div className="recipient-listing-card__body">
                  <h3 className="recipient-listing-card__title">{listing.title}</h3>
                  <div className="recipient-listing-card__meta">
                    {listing.location && <span>📍 {listing.location}</span>}
                    {listing.expiryDate && <span>🗓 Expires: {formatDate(listing.expiryDate)}</span>}
                  </div>
                  <div className="recipient-listing-card__footer">
                    <span className="recipient-listing-card__badge recipient-listing-card__badge--category">
                      {listing.categoryName || listing.category || 'Uncategorized'}
                    </span>
                    {listing.quantity && (
                      <span className="recipient-listing-card__badge recipient-listing-card__badge--quantity">
                        {listing.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

export default RecipientDashboardPage
