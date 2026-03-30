import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ListingForm from '../components/ListingForm.jsx'
import { createListing, fetchCategories, uploadListingImage } from '../services/listingService.js'
import '../styles/listing-editor.css'

function CreateListingPage() {
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
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories()
        setCategories(data)
      } catch {
        setCategories([])
      }
    }

    loadCategories()
  }, [])

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
      const createdListing = await createListing({
        title: form.title.trim(),
        description: form.description.trim(),
        quantity: form.quantity.trim(),
        expiryDate: form.expiryDate,
        location: form.location.trim(),
        categoryId: form.categoryId || null,
      })

      if (imageFile && createdListing?.id) {
        await uploadListingImage(createdListing.id, imageFile)
      }

      navigate('/dashboard/donor', { replace: true })
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Unable to create listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="listing-editor-page">
      <div className="card card--elevated listing-editor-page__card">
        <header className="card__header">
          <h1 className="card__title">Create listing</h1>
          <p className="card__subtitle">
            Share details about your available food so recipients can request it.
          </p>
        </header>
        <ListingForm
          form={form}
          errors={errors}
          categories={categories}
          submitLabel="Create listing"
          submittingLabel="Creating..."
          submitting={submitting}
          submitError={submitError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/dashboard/donor')}
          imageFile={imageFile}
          onImageChange={setImageFile}
          showImageField
        />
      </div>
    </section>
  )
}

export default CreateListingPage
