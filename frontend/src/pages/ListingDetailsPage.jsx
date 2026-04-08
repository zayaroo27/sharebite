import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchListingById } from '../services/listingService.js'
import { createRequest } from '../services/requestService.js'
import { reportListing } from '../services/reportService.js'
import { useAuth } from '../hooks/useAuth.js'
import Avatar from '../components/Avatar.jsx'
import Button from '../components/Button.jsx'
import ReportModal from '../components/ReportModal.jsx'
import '../styles/listing-details.css'

function ListingDetailsPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportFeedback, setReportFeedback] = useState('')
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchListingById(id)
        setListing(data)
      } catch (err) {
        setError('We could not load this listing right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const handleRequest = async () => {
    try {
      await createRequest(id)
      // eslint-disable-next-line no-alert
      alert('Your request has been sent to the donor.')
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('We could not send your request right now. Please try again.')
    }
  }

  const handleSubmitReport = async ({ reason, details }) => {
    setReportSubmitting(true)
    setReportError('')
    try {
      await reportListing(id, reason, details)
      setReportFeedback('Your listing report has been submitted for admin review.')
      setReportModalOpen(false)
    } catch (err) {
      setReportError(err?.response?.data?.message || 'Unable to submit report right now.')
    } finally {
      setReportSubmitting(false)
    }
  }

  const formatDate = (value, options) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return new Intl.DateTimeFormat('en-US', options).format(date)
  }

  const getStatusLabel = (value) => {
    if (!value) return ''
    const normalized = String(value).replaceAll('_', ' ').toLowerCase()
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  if (loading) {
    return (
      <section className="listing-details-page">
        <p>Loading listing…</p>
      </section>
    )
  }

  if (error || !listing) {
    return (
      <section className="listing-details-page">
        <p className="form-error">{error || 'Listing not found.'}</p>
      </section>
    )
  }

  const {
    donorId,
    title,
    description,
    quantity,
    expiryDate,
    location,
    status,
    categoryName,
    imageUrl,
    donorName,
    donorUsername,
    donorDisplayName,
    donorOrganisationName,
    donorCreatedAt,
    donorProfileImageUrl,
  } = listing

  const isRecipient = user?.role === 'RECIPIENT'
  const canReportListing = isAuthenticated && user?.role !== 'ADMIN'
  const donorPrimaryName = donorDisplayName || donorUsername || donorName || 'ShareBite donor'
  const donorSecondaryName = donorDisplayName && donorUsername ? `@${donorUsername}` : ''
  const listingStatusLabel = getStatusLabel(status)
  const memberSince = formatDate(donorCreatedAt, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <section className="listing-details-page">
      <div className="listing-details-layout">
        <article className="card listing-details__image-card">
          <div className="listing-details__image-wrapper">
            {imageUrl ? (
              <img src={imageUrl} alt={title} />
            ) : (
              <span className="listing-details__helper">
                No image available for this listing.
              </span>
            )}
          </div>
        </article>

        <div className="listing-details__sidebar">
          <article className="card listing-details__main-card">
            <header className="listing-details__content">
              <div className="listing-details__eyebrow-row">
                {listingStatusLabel && (
                  <span className="badge badge-info listing-details__status-pill">{listingStatusLabel}</span>
                )}
                {categoryName && (
                  <span className="badge badge-category listing-details__category-pill">{categoryName}</span>
                )}
              </div>

              <div className="listing-details__title-row">
                <h1 className="listing-details__title">{title}</h1>
                {quantity && (
                  <span className="badge badge-quantity listing-details__quantity-pill">{quantity}</span>
                )}
              </div>

              <div className="listing-details__meta-row">
                {location && (
                  <span className="listing-details__meta-item">
                    <span className="listing-details__meta-icon" aria-hidden="true">📍</span>
                    <span>{location}</span>
                  </span>
                )}
                {expiryDate && (
                  <span className="listing-details__meta-item">
                    <span className="listing-details__meta-icon" aria-hidden="true">⏰</span>
                    <span>Use by {formatDate(expiryDate, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}</span>
                  </span>
                )}
              </div>
            </header>

            {description && (
              <section className="listing-details__description-block">
                <p className="listing-details__section-label">Description</p>
                <p className="listing-details__description">{description}</p>
              </section>
            )}
          </article>

          {(donorName || donorUsername || donorDisplayName) && (
            <article className="card listing-details__trust-card">
              <div className="listing-details__trust-head">
                <Avatar
                  className="listing-details__avatar"
                  name={donorPrimaryName}
                  imageUrl={donorProfileImageUrl}
                  size={48}
                />
                <div className="listing-details__trust-copy">
                  <p className="listing-details__section-label">Donor</p>
                  <h2 className="listing-details__donor-name">{donorPrimaryName}</h2>
                  {donorSecondaryName && (
                    <p className="listing-details__donor-handle">{donorSecondaryName}</p>
                  )}
                </div>
              </div>
              {donorOrganisationName && (
                <p className="listing-details__trust-line">{donorOrganisationName}</p>
              )}
              {memberSince && (
                <p className="listing-details__trust-line">Member since {memberSince}</p>
              )}
              {donorId && (
                <Link to={`/users/${donorId}`} className="listing-details__profile-link">
                  View public profile
                </Link>
              )}
              {!donorOrganisationName && !memberSince && (
                <p className="listing-details__helper">
                  This donor can be contacted through approved requests and request-based messages.
                </p>
              )}
            </article>
          )}

          <article className="card listing-details__secondary-card listing-details__report-card">
            <h2 className="listing-details__section-title">Need to report this listing?</h2>
            <p className="listing-details__helper">
              If this listing looks misleading, unsafe, abusive, or otherwise inappropriate,
              you can send a report for admin review.
            </p>
            {canReportListing ? (
              <Button
                type="button"
                variant="danger"
                className="listing-details__request-btn"
                onClick={() => {
                  setReportError('')
                  setReportFeedback('')
                  setReportModalOpen(true)
                }}
              >
                Report listing
              </Button>
            ) : isAuthenticated ? (
              <p className="listing-details__helper">
                Admins review reports from the dashboard instead of filing listing reports.
              </p>
            ) : (
              <p className="listing-details__helper">
                <Link to="/login">Log in</Link> to report this listing.
              </p>
            )}
            {reportFeedback && <p className="form-helper listing-details__feedback">{reportFeedback}</p>}
          </article>

          <article className="card listing-details__secondary-card listing-details__request-card">
            <h2 className="listing-details__section-title">Request this listing</h2>
            <p className="listing-details__helper">
              If you are a recipient and this listing matches your needs, you
              can send a request to the donor. They will review your request
              and confirm collection details.
            </p>
            {isAuthenticated ? (
              isRecipient ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="listing-details__request-btn"
                  onClick={handleRequest}
                >
                  Request this food
                </Button>
              ) : (
                <p className="listing-details__helper">
                  You&rsquo;re signed in as {user.role}. Only recipients can request
                  listings.
                </p>
              )
            ) : (
              <p className="listing-details__helper">
                <Link to="/login">Log in as a recipient</Link> to request this
                listing.
              </p>
            )}
          </article>
        </div>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        title="Report listing"
        subtitle="Explain what is wrong with this listing so an admin can review the evidence."
        targetLabel={title ? `${title}${status ? ` (${status})` : ''}` : 'Selected listing'}
        submitting={reportSubmitting}
        submitError={reportError}
        onClose={() => {
          if (reportSubmitting) return
          setReportModalOpen(false)
          setReportError('')
        }}
        onSubmit={handleSubmitReport}
      />
    </section>
  )
}

export default ListingDetailsPage
