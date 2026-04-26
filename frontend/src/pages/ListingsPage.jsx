import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCategories, fetchListings } from '../services/listingService.js'
import { getCurrentLocationLabel } from '../services/locationService.js'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'
import { reportListing } from '../services/reportService.js'
import { useAuth } from '../hooks/useAuth.js'
import ReportModal from '../components/ReportModal.jsx'
import '../styles/listings.css'

const SEARCH_DEBOUNCE_MS = 400

function parseLocalDate(value) {
  if (!value || typeof value !== 'string') return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function getExpiryMeta(raw) {
  const date = parseLocalDate(raw)
  if (!date) {
    return { label: raw || '', className: '' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000)
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)

  if (diffDays < 0) {
    return {
      label: `Expired ${formattedDate}`,
      className: 'listing-card__meta-item--expired',
    }
  }

  if (diffDays === 0) {
    return {
      label: 'Expires today',
      className: 'listing-card__meta-item--warning',
    }
  }

  if (diffDays <= 7) {
    return {
      label: `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
      className: 'listing-card__meta-item--warning',
    }
  }

  return {
    label: `Expires ${formattedDate}`,
    className: '',
  }
}

function ListingsPage() {
  const [listings, setListings] = useState([])
  const [categories, setCategories] = useState([])
  const [locationOptions, setLocationOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationLookupError, setLocationLookupError] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [reportingId, setReportingId] = useState(null)
  const [reportError, setReportError] = useState('')
  const [reportFeedback, setReportFeedback] = useState('')
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    let active = true

    async function loadCategories() {
      try {
        const data = await fetchCategories()
        if (!active) return
        setCategories(Array.isArray(data) ? data : [])
      } catch {
        if (!active) return
        setCategories([])
      }
    }

    loadCategories()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [search])

  useEffect(() => {
    let active = true

    async function loadListings() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchListings({
          keyword: debouncedSearch,
          categoryId: categoryFilter,
          location: locationFilter,
        })

        if (!active) return

        const nextListings = Array.isArray(data) ? data : data.items ?? []
        setListings(nextListings)

        setLocationOptions((prev) => {
          const merged = new Set(prev)
          nextListings
            .map((item) => item.location)
            .filter(Boolean)
            .forEach((location) => merged.add(location))

          if (locationFilter) {
            merged.add(locationFilter)
          }

          return Array.from(merged).sort((left, right) => left.localeCompare(right))
        })
      } catch (err) {
        if (!active) return
        setListings([])
        setError('We could not load listings right now. Please try again soon.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadListings()

    return () => {
      active = false
    }
  }, [debouncedSearch, categoryFilter, locationFilter])

  const hasActiveFilters = useMemo(
    () => Boolean(debouncedSearch || categoryFilter || locationFilter),
    [debouncedSearch, categoryFilter, locationFilter],
  )
  const canReportListings = isAuthenticated && user?.role !== 'ADMIN'

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true)
    setLocationLookupError('')

    try {
      const locationLabel = await getCurrentLocationLabel()
      setLocationFilter(locationLabel)
      setLocationOptions((prev) => (
        Array.from(new Set([...prev, locationLabel])).sort((left, right) => left.localeCompare(right))
      ))
    } catch (error) {
      setLocationLookupError(error.message)
    } finally {
      setLocationLoading(false)
    }
  }

  const handleCardClick = (id) => {
    if (!id) return
    navigate(`/listings/${id}`)
  }

  const handleReportListing = async (event, listingId) => {
    event.stopPropagation()
    if (!listingId) return
    const listing = listings.find((item) => item.id === listingId) ?? null
    setReportError('')
    setReportFeedback('')
    setReportTarget(listing)
  }

  const handleCloseReportModal = () => {
    if (reportingId) return
    setReportTarget(null)
    setReportError('')
  }

  const handleSubmitReport = async ({ reason, details }) => {
    if (!reportTarget?.id) return

    setReportingId(reportTarget.id)
    setReportError('')
    try {
      await reportListing(reportTarget.id, reason, details)
      setReportFeedback('Your report was submitted and will be reviewed by an admin.')
      setReportTarget(null)
    } catch (err) {
      setReportError(err?.response?.data?.message || 'Unable to submit report right now.')
    } finally {
      setReportingId(null)
    }
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
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="listings-page__controls-group">
          <div className="listings-page__location-group">
            <select
              id="location-filter"
              className="form-select listings-page__select"
              value={locationFilter}
              onChange={(event) => {
                setLocationFilter(event.target.value)
                setLocationLookupError('')
              }}
            >
              <option value="">All Locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="listings-page__location-button"
              onClick={handleUseCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Finding location...' : 'Use my location'}
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading listings…</p>}
      {error && !loading && <p className="form-error">{error}</p>}
      {locationLookupError && !loading && <p className="form-error">{locationLookupError}</p>}
      {reportFeedback && !loading && <p className="form-helper">{reportFeedback}</p>}

      {!loading && !error && listings.length === 0 && (
        <div className="listings-empty">
          <p>{hasActiveFilters ? 'No listings found for the selected filters.' : 'No listings found.'}</p>
        </div>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="listings-grid">
          {listings.map((item) => (
            (() => {
              const expiryMeta = getExpiryMeta(item.expiryDate)
              return (
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

              <div className="listing-card__body">
                <div className="listing-card__title-row">
                  <h2 className="listing-card__title">{item.title}</h2>
                  {item.quantity && (
                    <span className="badge badge-quantity listing-card__quantity-pill">{item.quantity}</span>
                  )}
                </div>

                <div className="listing-card__meta">
                  {item.location && (
                    <span className="listing-card__meta-item">
                      <span className="listing-card__meta-icon" aria-hidden="true">📍</span>
                      <span>{item.location}</span>
                    </span>
                  )}
                  {item.expiryDate && (
                    <span className={`listing-card__meta-item ${expiryMeta.className}`.trim()}>
                      <span className="listing-card__meta-icon" aria-hidden="true">🗓</span>
                      <span>{expiryMeta.label}</span>
                    </span>
                  )}
                </div>

                <div className="listing-card__footer">
                  <span className="listing-card__category-pill">
                    {item.categoryName || 'Uncategorized'}
                  </span>
                  <div className="listing-card__footer-right">
                    <span className={`listing-card__status ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                    {canReportListings && (
                      <button
                        type="button"
                        className="listing-card__report-btn"
                        onClick={(event) => handleReportListing(event, item.id)}
                        disabled={reportingId === item.id}
                      >
                        {reportingId === item.id ? 'Reporting...' : 'Report'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
              )
            })()
          ))}
        </div>
      )}

      <ReportModal
        isOpen={Boolean(reportTarget)}
        title="Report listing"
        subtitle="Help our admins review this listing fairly by explaining the problem clearly."
        targetLabel={reportTarget?.title || 'Selected listing'}
        submitting={Boolean(reportingId)}
        submitError={reportError}
        onClose={handleCloseReportModal}
        onSubmit={handleSubmitReport}
      />
    </section>
  )
}

export default ListingsPage
