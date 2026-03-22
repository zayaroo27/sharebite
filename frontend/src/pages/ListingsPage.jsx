import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchListings } from '../services/listingService.js'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'
import '../styles/listings.css'

function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchListings()
        setListings(Array.isArray(data) ? data : data.items ?? [])
      } catch (err) {
        setError('We could not load listings right now. Please try again soon.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .map((item) => item.categoryName)
            .filter(Boolean)
            .sort(),
        ),
      ),
    [listings],
  )

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          listings
            .map((item) => item.location)
            .filter(Boolean)
            .sort(),
        ),
      ),
    [listings],
  )

  const filteredListings = useMemo(
    () => {
      const searchLower = search.trim().toLowerCase()

      return listings.filter((item) => {
        if (categoryFilter && item.categoryName !== categoryFilter) return false
        if (locationFilter && item.location !== locationFilter) return false

        if (!searchLower) return true

        const haystack = [item.title, item.description, item.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(searchLower)
      })
    },
    [listings, search, categoryFilter, locationFilter],
  )

  const handleCardClick = (id) => {
    if (!id) return
    navigate(`/listings/${id}`)
  }

  const formatDate = (raw) => {
    if (!raw) return ''
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return raw

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const getStatusLabel = (status) => {
    if (!status) return 'Available'
    const normalized = String(status).replaceAll('_', ' ').toLowerCase()
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const getStatusClass = (status) => {
    const value = String(status || 'AVAILABLE').toUpperCase()
    if (value.includes('REQUEST')) return 'listing-card__status--requested'
    if (value.includes('EXPIRE')) return 'listing-card__status--expired'
    return 'listing-card__status--available'
  }

  return (
    <section className="listings-page">
      <div className="listings-page__header">
        <h1>Available food near you</h1>
        <p className="listings-page__subtitle">
          Discover fresh food available for pickup in your area
        </p>
      </div>

      <div className="listings-page__controls">
        <div className="listings-page__search">
          <span className="listings-page__search-icon" aria-hidden="true">⌕</span>
          <input
            id="search"
            name="search"
            className="form-input listings-page__search-input"
            placeholder="Search by name or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="listings-page__controls-group">
          <select
            id="category-filter"
            className="form-select listings-page__select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="listings-page__controls-group">
          <select
            id="location-filter"
            className="form-select listings-page__select"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p>Loading listings…</p>}
      {error && !loading && <p className="form-error">{error}</p>}

      {!loading && !error && filteredListings.length === 0 && (
        <div className="listings-empty">
          <p>No listings match your current filters.</p>
        </div>
      )}

      {!loading && !error && filteredListings.length > 0 && (
        <div className="listings-grid">
          {filteredListings.map((item) => (
            <article
              key={item.id}
              className="card listing-card"
              onClick={() => handleCardClick(item.id)}
            >
              <div className="listing-card__image-wrapper">
                <img
                  src={item.imageUrl || LISTING_PLACEHOLDER_IMAGE}
                  alt={item.title}
                  onError={(event) => {
                    event.currentTarget.src = LISTING_PLACEHOLDER_IMAGE
                  }}
                />
              </div>

              <div className="listing-card__title-row">
                <div>
                  <h2 className="listing-card__title">{item.title}</h2>
                </div>
                {item.quantity && (
                  <span className="badge badge-quantity">{item.quantity}</span>
                )}
              </div>

              <div className="listing-card__meta">
                {item.location && (
                  <span className="listing-card__meta-item">
                    <span aria-hidden="true">📍</span>
                    <span>{item.location}</span>
                  </span>
                )}
                {item.expiryDate && (
                  <span className="listing-card__meta-item">
                    <span aria-hidden="true">🗓</span>
                    <span>Expires: {formatDate(item.expiryDate)}</span>
                  </span>
                )}
              </div>

              <div className="listing-card__footer">
                <span className="listing-card__category-pill">
                  {item.categoryName || 'Uncategorized'}
                </span>
                <span className={`listing-card__status ${getStatusClass(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default ListingsPage
