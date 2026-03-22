import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchListingById } from '../services/listingService.js'
import { createRequest } from '../services/requestService.js'
import { useAuth } from '../hooks/useAuth.js'
import Button from '../components/Button.jsx'
import '../styles/listing-details.css'

function ListingDetailsPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    title,
    description,
    quantity,
    expiryDate,
    location,
    categoryName,
    imageUrl,
    donorName,
  } = listing

  const isRecipient = user?.role === 'RECIPIENT'

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
          <article className="card">
            <header className="listing-details__content">
              <div className="listing-details__title-row">
                <h1 className="listing-details__title">{title}</h1>
                {quantity && (
                  <span className="badge badge-quantity">{quantity}</span>
                )}
              </div>
              <div className="listing-details__meta-row">
                {categoryName && (
                  <span className="badge badge-category">{categoryName}</span>
                )}
                {location && (
                  <span className="listing-details__meta-item">
                    <span aria-hidden="true">📍</span>
                    <span>{location}</span>
                  </span>
                )}
                {expiryDate && (
                  <span className="listing-details__meta-item">
                    <span aria-hidden="true">⏰</span>
                    <span>Use by {expiryDate}</span>
                  </span>
                )}
              </div>
            </header>

            {description && (
              <section>
                <h2 className="listing-details__section-title">Description</h2>
                <p className="listing-details__description">{description}</p>
              </section>
            )}
          </article>

          {donorName && (
            <article className="card">
              <h2 className="listing-details__section-title">Donor</h2>
              <p className="listing-details__donor-name">{donorName}</p>
            </article>
          )}

          <article className="card">
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
    </section>
  )
}

export default ListingDetailsPage
