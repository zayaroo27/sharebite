import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import { createListing, fetchCategories } from '../services/listingService.js'

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
      await createListing({
        title: form.title.trim(),
        description: form.description.trim(),
        quantity: form.quantity.trim(),
        expiryDate: form.expiryDate,
        location: form.location.trim(),
        categoryId: form.categoryId || null,
      })

      navigate('/dashboard/donor', { replace: true })
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Unable to create listing. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="card card--elevated">
        <header className="card__header">
          <h1 className="card__title">Create listing</h1>
          <p className="card__subtitle">
            Share details about your available food so recipients can request it.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <TextInput
            id="title"
            name="title"
            label="Title"
            value={form.title}
            onChange={handleChange}
            placeholder="Fresh cooked rice"
            error={errors.title}
            required
          />

          <div className="form-field">
            <label className="form-label" htmlFor="description">
              Description <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`form-input ${errors.description ? 'form-input--error' : ''}`.trim()}
              value={form.description}
              onChange={handleChange}
              placeholder="Add food type, condition, pickup note, etc."
              rows={4}
              required
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>

          <TextInput
            id="quantity"
            name="quantity"
            label="Quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="10 meal boxes"
            error={errors.quantity}
            required
          />

          <TextInput
            id="expiryDate"
            name="expiryDate"
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={handleChange}
            error={errors.expiryDate}
            required
          />

          <TextInput
            id="location"
            name="location"
            label="Pickup location"
            value={form.location}
            onChange={handleChange}
            placeholder="Mirpur DOHS"
            error={errors.location}
            required
          />

          <div className="form-field">
            <label className="form-label" htmlFor="categoryId">Category (optional)</label>
            <select
              id="categoryId"
              name="categoryId"
              className="form-input"
              value={form.categoryId}
              onChange={handleChange}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {submitError && <p className="form-error">{submitError}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button type="submit" variant="secondary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create listing'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/donor')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default CreateListingPage
