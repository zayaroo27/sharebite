import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ListingForm from '../components/ListingForm.jsx'
import { fetchCategories, fetchListingById, updateMyListing, uploadListingImage } from '../services/listingService.js'
import '../styles/listing-editor.css'

function EditListingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    quantity: '',
    expiryDate: '',
    location: '',
    categoryId: '',
  })
  const [categories, setCategories] = useState([])
  const [imageFile, setImageFile] = useState(null)
  const [currentImageUrl, setCurrentImageUrl] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [listing, categoryData] = await Promise.all([
          fetchListingById(id),
          fetchCategories(),
        ])

        if (!active) return

        setForm({
          title: listing.title || '',
          description: listing.description || '',
          quantity: listing.quantity || '',
          expiryDate: listing.expiryDate || '',
          location: listing.location || '',
          categoryId: listing.categoryId || '',
        })
        setCurrentImageUrl(listing.imageUrl || '')
        setCategories(Array.isArray(categoryData) ? categoryData : [])
      } catch (error) {
        if (!active) return
        setSubmitError('We could not load this listing right now. Please try again.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [id])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim()) newErrors.title = 'Title is required.'
    if (!form.description.trim()) newErrors.description = 'Description is required.'
    if (!form.quantity.trim()) newErrors.quantity = 'Quantity is required.'
    if (!form.expiryDate) newErrors.expiryDate = 'Expiry date is required.'
    if (!form.location.trim()) newErrors.location = 'Location is required.'
    return newErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await updateMyListing(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        quantity: form.quantity.trim(),
        expiryDate: form.expiryDate,
        location: form.location.trim(),
        categoryId: form.categoryId || null,
      })

      if (imageFile) {
        await uploadListingImage(id, imageFile)
      }

      navigate('/dashboard/donor', { replace: true })
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Unable to update this listing right now.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="listing-editor-page">
        <p>Loading listing…</p>
      </section>
    )
  }

  return (
    <section className="listing-editor-page">
      <div className="card card--elevated listing-editor-page__card">
        <header className="card__header">
          <h1 className="card__title">Edit listing</h1>
          <p className="card__subtitle">
            Update your food listing details and keep the information accurate for recipients.
          </p>
        </header>

        <ListingForm
          form={form}
          errors={errors}
          categories={categories}
          submitLabel="Save changes"
          submittingLabel="Saving changes..."
          submitting={submitting}
          submitError={submitError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/dashboard/donor')}
          imageFile={imageFile}
          currentImageUrl={currentImageUrl}
          onImageChange={setImageFile}
          showImageField
        />
      </div>
    </section>
  )
}

export default EditListingPage
