import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import { fetchPublicUserProfile } from '../services/userService.js'
import '../styles/public-user-profile.css'

function formatMemberSince(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  if (!normalized) return 'Member'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getVisibleStats(profile) {
  const role = String(profile?.role || '').trim().toUpperCase()

  if (role === 'DONOR') {
    return [
      { label: 'Listings Created', value: profile.listingsCreatedCount ?? 0 },
      { label: 'Active Listings', value: profile.activeListingsCount ?? 0 },
      { label: 'Completed Donations', value: profile.completedDonationsCount ?? 0 },
    ]
  }

  if (role === 'RECIPIENT') {
    return [
      { label: 'Requests Made', value: profile.requestsMadeCount ?? 0 },
      { label: 'Successful Pickups', value: profile.successfulPickupsCount ?? 0 },
    ]
  }

  return []
}

function PublicUserProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPublicUserProfile(id)
        if (!active) return
        setProfile(data)
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.message || 'We could not load this profile right now. Please try again.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    if (id) {
      loadProfile()
    }

    return () => {
      active = false
    }
  }, [id])

  const displayName = useMemo(() => {
    if (!profile) return ''
    return profile.displayName || profile.username || 'ShareBite member'
  }, [profile])

  if (loading) {
    return (
      <section className="public-profile-page">
        <p>Loading profile…</p>
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="public-profile-page">
        <p className="form-error">{error || 'Profile not found.'}</p>
        <p className="public-profile-page__back-link">
          <Link to="/">Return home</Link>
        </p>
      </section>
    )
  }

  const stats = getVisibleStats(profile)

  return (
    <section className="public-profile-page">
      <div className="card card--elevated public-profile-page__card">
        <header className="card__header">
          <h1 className="card__title">Public profile</h1>
          <p className="card__subtitle">
            A read-only summary to help ShareBite users understand who they are interacting with.
          </p>
        </header>

        <div className="public-profile-page__summary">
          <Avatar
            className="public-profile-page__avatar"
            name={displayName}
            imageUrl={profile.profileImageUrl}
            size={84}
          />

          <div className="public-profile-page__identity">
            <h2 className="public-profile-page__name">{displayName}</h2>
            {profile.displayName && profile.username && (
              <p className="public-profile-page__username">@{profile.username}</p>
            )}
            {profile.organisationName && (
              <p className="public-profile-page__org">{profile.organisationName}</p>
            )}
            <div className="public-profile-page__meta">
              <span>{formatRole(profile.role)}</span>
              <span aria-hidden="true">•</span>
              <span>Member since {formatMemberSince(profile.createdAt)}</span>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <section className="public-profile-page__stats">
            {stats.map((stat) => (
              <article key={stat.label} className="public-profile-page__stat-card">
                <span className="public-profile-page__stat-label">{stat.label}</span>
                <strong className="public-profile-page__stat-value">{stat.value}</strong>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  )
}

export default PublicUserProfilePage
