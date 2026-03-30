import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDonorDashboard, approveRequest, rejectRequest } from '../services/donorService.js'
import { deleteMyListing } from '../services/listingService.js'
import Button from '../components/Button.jsx'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'
import '../styles/donor-dashboard.css'

function DonorDashboardPage() {
  const [listings, setListings] = useState([])
  const [requests, setRequests] = useState([])
  const [showCanceledRequests, setShowCanceledRequests] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDonorDashboard()
        setListings(data.listings ?? [])
        setRequests(data.requests ?? [])
      } catch (err) {
        setError('We could not load your dashboard right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
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

    try {
      await approveRequest(requestId)
      setRequests((prev) => prev.filter((req) => (req.requestId ?? req.id) !== requestId))
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to approve this request right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    }
  }

  const handleReject = async (requestId) => {
    if (!requestId) {
      // eslint-disable-next-line no-alert
      alert('This request is missing an ID and cannot be rejected.')
      return
    }

    try {
      await rejectRequest(requestId)
      setRequests((prev) => prev.filter((req) => (req.requestId ?? req.id) !== requestId))
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || 'Unable to reject this request right now.'
      // eslint-disable-next-line no-alert
      alert(message)
    }
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('en-US').format(date)
  }

  const summary = useMemo(() => {
    const totalDonations = listings.length

    const totalQuantity = listings.reduce((sum, listing) => {
      const parsed = Number.parseFloat(String(listing.quantity ?? '').replace(/[^0-9.]/g, ''))
      return Number.isFinite(parsed) ? sum + parsed : sum
    }, 0)

    const ngosHelped = new Set(
      requests
        .map((request) => request.recipientName)
        .filter(Boolean),
    ).size

    return {
      totalDonations,
      totalQuantity,
      ngosHelped,
    }
  }, [listings, requests])

  const pendingRequests = useMemo(
    () => requests.filter((request) => String(request.status || '').toUpperCase() === 'PENDING'),
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
        {listings.length === 0 ? (
          <div className="card">
            <p className="donor-dashboard__subtitle">
              You have no active listings yet. Create your first listing to start sharing food.
            </p>
          </div>
        ) : (
          <div className="donor-dashboard__listing-grid">
            {listings.map((listing) => (
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
                    <Button variant="outline" className="donor-listing-card__delete-btn" onClick={() => handleDelete(listing.id)}>Delete</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
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
            <div className="donor-dashboard__requests-list">
              {visibleRequests.map((request) => (
                <div key={request.requestId ?? request.id} className="donor-dashboard__request-row">
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
                      <Button variant="primary" className="donor-dashboard__approve-btn" onClick={() => handleApprove(request.requestId ?? request.id)}>
                        ✓ Approve
                      </Button>
                      <Button variant="outline" className="donor-dashboard__reject-btn" onClick={() => handleReject(request.requestId ?? request.id)}>
                        ✕ Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      <article>
        <h2 className="donor-dashboard__section-title">Completed Donations</h2>
        <div className="donor-dashboard__summary-grid">
          <div className="card donor-dashboard__summary-card">
            <div className="donor-dashboard__summary-icon">📦</div>
            <div>
              <div className="donor-dashboard__summary-value">{summary.totalDonations}</div>
              <div className="donor-dashboard__summary-label">Total Donations</div>
            </div>
          </div>
          <div className="card donor-dashboard__summary-card">
            <div className="donor-dashboard__summary-icon">🧡</div>
            <div>
              <div className="donor-dashboard__summary-value">{summary.totalQuantity || 0} kg</div>
              <div className="donor-dashboard__summary-label">Food Donated</div>
            </div>
          </div>
          <div className="card donor-dashboard__summary-card">
            <div className="donor-dashboard__summary-icon">✅</div>
            <div>
              <div className="donor-dashboard__summary-value">{summary.ngosHelped}</div>
              <div className="donor-dashboard__summary-label">NGOs Helped</div>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default DonorDashboardPage
