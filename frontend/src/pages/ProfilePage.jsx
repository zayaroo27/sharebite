import { useEffect, useState } from 'react'
import { fetchProfile, updateProfile, uploadProfileImage } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'
import Avatar from '../components/Avatar.jsx'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import '../styles/profile.css'

function formatProfileDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
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

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl('')
      return undefined
    }

    const nextPreviewUrl = window.URL.createObjectURL(selectedImage)
    setImagePreviewUrl(nextPreviewUrl)

    return () => {
      window.URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [selectedImage])

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

  const handleImageSelection = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setSelectedImage(null)
      return
    }
    if (!String(file.type || '').startsWith('image/')) {
      setError('Please choose a JPG or PNG image file.')
      return
    }
    setError('')
    setSelectedImage(file)
  }

  const handleImageUpload = async () => {
    if (!selectedImage) return
    setError('')
    setSuccess('')
    setUploadingImage(true)

    try {
      const updated = await uploadProfileImage(selectedImage)
      setProfile((prev) => ({ ...prev, ...updated }))
      setUser((prev) => ({ ...(prev || {}), ...updated }))
      setSelectedImage(null)
      setSuccess('Your profile picture has been updated.')
    } catch (err) {
      setError(err?.response?.data?.message || 'We could not upload your profile picture right now.')
    } finally {
      setUploadingImage(false)
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
      <div className="card card--elevated profile-page__card">
        <header className="card__header">
          <h1 className="card__title">Account profile</h1>
          <p className="card__subtitle">
            Review your ShareBite account details and keep your contact
            information up to date.
          </p>
        </header>

        {profile && (
          <div className="profile-page__overview">
            <div className="profile-page__avatar-column">
              <Avatar
                className="profile-page__avatar"
                name={profile.displayName || profile.username || user?.username}
                imageUrl={imagePreviewUrl || profile.profileImageUrl || user?.profileImageUrl}
                size={88}
              />
              <div className="profile-page__upload-group">
                <label className="profile-page__upload-label" htmlFor="profile-image">
                  Choose profile picture
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageSelection}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleImageUpload}
                  disabled={!selectedImage || uploadingImage}
                >
                  {uploadingImage ? 'Uploading…' : 'Upload image'}
                </Button>
              </div>
            </div>
            <div className="profile-page__details-grid">
              <div>
                <span className="profile-page__meta-label">Username</span>
                <div>{profile.username || profile.name || '—'}</div>
              </div>
              <div>
                <span className="profile-page__meta-label">Email</span>
                <div>{profile.email}</div>
              </div>
              <div>
                <span className="profile-page__meta-label">Role</span>
                <div>{profile.role}</div>
              </div>
              <div>
                <span className="profile-page__meta-label">Status</span>
                <div>{profile.status || 'ACTIVE'}</div>
              </div>
              {profile.createdAt && (
                <div>
                  <span className="profile-page__meta-label">Member since</span>
                  <div>{formatProfileDate(profile.createdAt)}</div>
                </div>
              )}
            </div>
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
