import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDonorDashboard, approveRequest, rejectRequest, completeRequest } from '../services/donorService.js'
import { deleteMyListing } from '../services/listingService.js'
import Button from '../components/Button.jsx'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'
import '../styles/donor-dashboard.css'

function DonorDashboardPage() {
  const [listings, setListings] = useState([])
  const [requests, setRequests] = useState([])
  const [showCanceledRequests, setShowCanceledRequests] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requestActionId, setRequestActionId] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loadDashboard = async ({ preserveLoadingState = false } = {}) => {
    if (!preserveLoadingState) {
      setLoading(true)
    }

    try {
      const data = await fetchDonorDashboard()
      setListings(data.listings ?? [])
      setRequests(data.requests ?? [])
      setError('')
    } catch (err) {
      if (!preserveLoadingState) {
        setError('We could not load your dashboard right now. Please try again.')
      } else {
        // eslint-disable-next-line no-alert
        alert(err?.response?.data?.message || 'Unable to refresh your dashboard right now.')
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

  const handleCreate = () => {
    navigate('/dashboard/donor/create-listing')
  }

  const handleEdit = (listing) => {
    if (!listing?.id) return
    navigate(`/dashboard/donor/edit-listing/${listing.id}`)
  }

  const handleDelete = async (listingId) => {
    if (!listingId) return

    if (!window.confirm('Are you sure you want to delete this listing?')) return

    try {
      await deleteMyListing(listingId)
      setListings((prev) => prev.filter((listing) => listing.id !== listingId))
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to delete this listing right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    }
  }

  const handleApprove = async (requestId) => {
    if (!requestId) {
      // eslint-disable-next-line no-alert
      alert('This request is missing an ID and cannot be approved.')
      return
    }

    setRequestActionId(requestId)
    try {
      await approveRequest(requestId)
      await loadDashboard({ preserveLoadingState: true })
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to approve this request right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    } finally {
      setRequestActionId(null)
    }
  }

  const handleReject = async (requestId) => {
    if (!requestId) {
      // eslint-disable-next-line no-alert
      alert('This request is missing an ID and cannot be rejected.')
      return
    }

    setRequestActionId(requestId)
    try {
      await rejectRequest(requestId)
      await loadDashboard({ preserveLoadingState: true })
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to reject this request right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    } finally {
      setRequestActionId(null)
    }
  }

  const handleComplete = async (requestId) => {
    if (!requestId) {
      // eslint-disable-next-line no-alert
      alert('This request is missing an ID and cannot be completed.')
      return
    }

    if (!window.confirm('Mark this donation as completed?')) return

    setRequestActionId(requestId)
    try {
      await completeRequest(requestId)
      await loadDashboard({ preserveLoadingState: true })
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to complete this donation right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    } finally {
      setRequestActionId(null)
    }
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('en-US').format(date)
  }

  const hasDonorConfirmedCompletion = (request) => Boolean(request?.donorCompletedAt)
  const hasRecipientConfirmedCompletion = (request) => Boolean(request?.recipientCompletedAt)

  const pendingRequests = useMemo(
    () => requests.filter((request) => String(request.status || '').toUpperCase() === 'PENDING'),
    [requests],
  )

  const completedRequests = useMemo(
    () => requests
      .filter((request) => String(request.status || '').toUpperCase() === 'COMPLETED')
      .sort((left, right) => {
        const leftDate = new Date(
          left.completedDate || left.recipientCompletedAt || left.donorCompletedAt || left.decisionDate || left.requestDate || 0,
        ).getTime()
        const rightDate = new Date(
          right.completedDate || right.recipientCompletedAt || right.donorCompletedAt || right.decisionDate || right.requestDate || 0,
        ).getTime()
        return rightDate - leftDate
      }),
    [requests],
  )

  const activeListings = useMemo(
    () => listings.filter((listing) => String(listing.status || '').toUpperCase() !== 'COMPLETED'),
    [listings],
  )

  const approvedRequests = useMemo(
    () => requests.filter((request) => String(request.status || '').toUpperCase() === 'APPROVED'),
    [requests],
  )

  const canceledRequests = useMemo(
    () => requests.filter((request) => String(request.status || '').toUpperCase() === 'CANCELED'),
    [requests],
  )

  const visibleRequests = showCanceledRequests ? canceledRequests : pendingRequests

  if (loading) {
    return (
      <section className="donor-dashboard">
        <p>Loading your dashboard…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="donor-dashboard">
        <p className="form-error">{error}</p>
      </section>
    )
  }

  return (
    <section className="donor-dashboard">
      <div className="donor-dashboard__header">
        <div className="donor-dashboard__title-group">
          <h1 className="donor-dashboard__page-title">Donor Dashboard</h1>
          <p className="donor-dashboard__page-subtitle donor-dashboard__subtitle">
            Manage your food donations and help reduce waste
          </p>
        </div>
        <Button variant="primary" className="donor-dashboard__create-btn" onClick={handleCreate}>
          + Create New Listing
        </Button>
      </div>

      <article>
        <h2 className="donor-dashboard__section-title">My Listings</h2>
        {activeListings.length === 0 ? (
          <div className="card">
            <p className="donor-dashboard__subtitle">
              {listings.length === 0
                ? 'You have no active listings yet. Create your first listing to start sharing food.'
                : 'You have no active listings right now. Completed donations are available below in your history.'}
            </p>
          </div>
        ) : (
          <div className="donor-dashboard__listing-grid">
            {activeListings.map((listing) => (
              <article key={listing.id} className="card donor-listing-card">
                <div className="donor-listing-card__image-wrap">
                  <img
                    src={listing.imageUrl || LISTING_PLACEHOLDER_IMAGE}
                    alt={listing.title}
                    onError={(event) => {
                      event.currentTarget.src = LISTING_PLACEHOLDER_IMAGE
                    }}
                  />
                </div>
                <div className="donor-listing-card__body">
                  <h3 className="donor-listing-card__title">{listing.title}</h3>
                  <div className="donor-listing-card__meta">
                    {listing.location && <span>📍 {listing.location}</span>}
                    {listing.expiryDate && <span>🗓 Expires: {formatDate(listing.expiryDate)}</span>}
                  </div>
                  <div className="donor-listing-card__footer">
                    <span className="donor-listing-card__badge donor-listing-card__badge--category">
                      {listing.categoryName || listing.category || 'Uncategorized'}
                    </span>
                    {listing.quantity && (
                      <span className="donor-listing-card__badge donor-listing-card__badge--quantity">
                        {listing.quantity}
                      </span>
                    )}
                  </div>
                  <div className="donor-listing-card__actions">
                    <Button variant="outline" className="donor-listing-card__edit-btn" onClick={() => handleEdit(listing)}>Edit</Button>
                    <Button variant="danger" className="donor-listing-card__delete-btn" onClick={() => handleDelete(listing.id)}>Delete</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article>
        <h2 className="donor-dashboard__section-title">Approved Handovers</h2>
        <div className="card donor-dashboard__requests-card">
          {approvedRequests.length === 0 ? (
            <p className="donor-dashboard__subtitle">
              No approved requests are waiting for completion right now.
            </p>
          ) : (
            <div className="donor-dashboard__requests-list donor-dashboard__requests-list--scrollable">
              {approvedRequests.map((request) => {
                const requestId = request.requestId ?? request.id
                const isProcessing = requestActionId === requestId
                const donorConfirmed = hasDonorConfirmedCompletion(request)
                const recipientConfirmed = hasRecipientConfirmedCompletion(request)
                const waitingText = donorConfirmed
                  ? 'Waiting for recipient receipt confirmation'
                  : recipientConfirmed
                    ? 'Recipient already confirmed receipt'
                    : ''

                return (
                  <div key={requestId} className="donor-dashboard__request-row">
                    <div className="donor-dashboard__request-main">
                      <h3 className="donor-dashboard__request-title">{request.listingTitle}</h3>
                      <div className="donor-dashboard__request-meta">
                        {request.recipientName && <span>Approved for: {request.recipientName}</span>}
                        <span>Approved on: {formatDate(request.decisionDate || request.requestDate)}</span>
                        <span className="donor-dashboard__request-status">
                          {String(request.status || 'APPROVED').toLowerCase()}
                        </span>
                        {waitingText && <span>{waitingText}</span>}
                      </div>
                    </div>
                    <div className="donor-dashboard__request-actions">
                      <Button
                        variant="primary"
                        className="donor-dashboard__complete-btn"
                        onClick={() => handleComplete(requestId)}
                        disabled={isProcessing || donorConfirmed}
                      >
                        {isProcessing ? 'Confirming...' : donorConfirmed ? 'Waiting for recipient' : 'Mark as handed over'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </article>

      <article>
        <div className="donor-dashboard__section-head">
          <h2 className="donor-dashboard__section-title">Incoming Requests</h2>
          {canceledRequests.length > 0 && (
            <button
              type="button"
              className="donor-dashboard__toggle-link"
              onClick={() => setShowCanceledRequests((prev) => !prev)}
            >
              {showCanceledRequests ? 'Show pending requests' : `Show canceled (${canceledRequests.length})`}
            </button>
          )}
        </div>
        <div className="card donor-dashboard__requests-card">
          {visibleRequests.length === 0 ? (
            <p className="donor-dashboard__subtitle">
              {showCanceledRequests
                ? 'You have no canceled requests.'
                : 'You have no pending requests right now.'}
            </p>
          ) : (
            <div className="donor-dashboard__requests-list donor-dashboard__requests-list--scrollable">
              {visibleRequests.map((request) => {
                const requestId = request.requestId ?? request.id
                const isProcessing = requestActionId === requestId

                return (
                  <div key={requestId} className="donor-dashboard__request-row">
                    <div className="donor-dashboard__request-main">
                      <h3 className="donor-dashboard__request-title">{request.listingTitle}</h3>
                      <div className="donor-dashboard__request-meta">
                        {request.recipientName && <span>Requested by: {request.recipientName}</span>}
                        <span>Date: {formatDate(request.requestDate || request.requestedAt)}</span>
                        <span className="donor-dashboard__request-status">
                          {String(request.status || 'PENDING').toLowerCase()}
                        </span>
                      </div>
                    </div>
                    {!showCanceledRequests && (
                      <div className="donor-dashboard__request-actions">
                        <Button
                          variant="primary"
                          className="donor-dashboard__approve-btn"
                          onClick={() => handleApprove(requestId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Updating...' : '✓ Approve'}
                        </Button>
                        <Button
                          variant="danger"
                          className="donor-dashboard__reject-btn"
                          onClick={() => handleReject(requestId)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Updating...' : '✕ Reject'}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </article>

      <article>
        <h2 className="donor-dashboard__section-title">Donation History</h2>
        <div className="card donor-dashboard__requests-card">
          {completedRequests.length === 0 ? (
            <p className="donor-dashboard__subtitle">
              Completed donations will appear here once both donor and recipient confirmations are finished.
            </p>
          ) : (
            <div className="donor-dashboard__requests-list donor-dashboard__requests-list--scrollable donor-dashboard__requests-list--history">
              {completedRequests.map((request) => (
                <div key={request.requestId ?? request.id} className="donor-dashboard__request-row donor-dashboard__request-row--history">
                  <div className="donor-dashboard__request-main">
                    <h3 className="donor-dashboard__request-title">{request.listingTitle}</h3>
                    <div className="donor-dashboard__request-meta">
                      {request.recipientName && <span>Completed for: {request.recipientName}</span>}
                      <span>Finished on: {formatDate(request.completedDate || request.recipientCompletedAt || request.donorCompletedAt)}</span>
                      <span className="donor-dashboard__request-status donor-dashboard__request-status--completed">
                        completed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}

export default DonorDashboardPage
