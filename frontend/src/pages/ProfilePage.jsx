import { useEffect, useState } from 'react'
import { fetchProfile, updateProfile } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'

function ProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    displayName: '',
    phoneNumber: '',
    organisationName: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProfile()
        setProfile(data)
        setForm({
          displayName: data.displayName || data.name || '',
          phoneNumber: data.phoneNumber || '',
          organisationName: data.organisationName || '',
        })
      } catch (err) {
        setError('We could not load your profile right now. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const updated = await updateProfile(form)
      setProfile((prev) => ({ ...prev, ...updated }))
      setUser((prev) => ({ ...(prev || {}), ...updated }))
      setSuccess('Your profile has been updated.')
    } catch (err) {
      setError('We could not save your changes right now. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section>
        <p>Loading your profile…</p>
      </section>
    )
  }

  if (error && !profile) {
    return (
      <section>
        <p className="form-error">{error}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="card card--elevated">
        <header className="card__header">
          <h1 className="card__title">Account profile</h1>
          <p className="card__subtitle">
            Review your ShareBite account details and keep your contact
            information up to date.
          </p>
        </header>

        {profile && (
          <div style={{ marginBottom: '1.5rem', display: 'grid', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-color-text-muted)' }}>
                Username
              </span>
              <div>{profile.username || profile.name || '—'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-color-text-muted)' }}>
                Email
              </span>
              <div>{profile.email}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-color-text-muted)' }}>
                Role
              </span>
              <div>{profile.role}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sb-color-text-muted)' }}>
                Status
              </span>
              <div>{profile.status || 'ACTIVE'}</div>
            </div>
            {profile.createdAt && (
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--sb-color-text-muted)',
                  }}
                >
                  Member since
                </span>
                <div>{profile.createdAt}</div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} noValidate>
          <TextInput
            id="displayName"
            name="displayName"
            label="Display name"
            value={form.displayName}
            onChange={handleChange}
            placeholder="How your name appears to others"
          />

          <TextInput
            id="phoneNumber"
            name="phoneNumber"
            label="Phone number"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="Optional contact number"
          />

          <TextInput
            id="organisationName"
            name="organisationName"
            label="Organisation name"
            value={form.organisationName}
            onChange={handleChange}
            placeholder="If you represent an organisation"
          />

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-helper">{success}</p>}

          <Button
            type="submit"
            variant="secondary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>
    </section>
  )
}

export default ProfilePage
