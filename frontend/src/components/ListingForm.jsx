import { useEffect, useRef, useState } from 'react'
import TextInput from './TextInput.jsx'
import Button from './Button.jsx'
import { LISTING_PLACEHOLDER_IMAGE } from '../constants/placeholders.js'

function ListingForm({
  form,
  errors,
  categories,
  submitLabel,
  submittingLabel,
  submitting,
  submitError,
  onChange,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
  imageFile = null,
  currentImageUrl = '',
  onImageChange,
  showImageField = false,
  onUseCurrentLocation,
  locationLoading = false,
  locationLookupError = '',
}) {
  const fileInputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const selectedImageName = imageFile?.name || ''

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [imageFile])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const imagePreviewSrc = previewUrl || currentImageUrl || LISTING_PLACEHOLDER_IMAGE

  return (
    <form onSubmit={onSubmit} noValidate className="listing-editor__form">
      <TextInput
        id="title"
        name="title"
        label="Title"
        value={form.title}
        onChange={onChange}
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
          onChange={onChange}
          placeholder="Add food type, condition, pickup note, etc."
          rows={5}
          required
        />
        {errors.description && <p className="form-error">{errors.description}</p>}
      </div>

      <div className="listing-editor__grid">
        <TextInput
          id="quantity"
          name="quantity"
          label="Quantity"
          value={form.quantity}
          onChange={onChange}
          placeholder="10 meal boxes"
          error={errors.quantity}
          required
        />

        <div className="form-field">
          <label className="form-label" htmlFor="location">
            Pickup location <span aria-hidden="true">*</span>
          </label>
          <input
            id="location"
            name="location"
            className={`form-input ${errors.location ? 'form-input--error' : ''}`.trim()}
            value={form.location}
            onChange={onChange}
            placeholder="Mirpur DOHS"
            aria-invalid={Boolean(errors.location)}
            aria-describedby={errors.location ? 'location-error' : locationLookupError ? 'location-lookup-error' : undefined}
            required
          />
          {onUseCurrentLocation && (
            <div className="listing-editor__location-actions">
              <Button
                type="button"
                variant="outline"
                onClick={onUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? 'Finding location...' : 'Use current location'}
              </Button>
            </div>
          )}
          {locationLookupError && !errors.location && (
            <p id="location-lookup-error" className="form-error">
              {locationLookupError}
            </p>
          )}
          {errors.location && (
            <p id="location-error" className="form-error">
              {errors.location}
            </p>
          )}
        </div>
      </div>

      <div className="listing-editor__grid">
        <TextInput
          id="expiryDate"
          name="expiryDate"
          label="Expiry date"
          type="date"
          value={form.expiryDate}
          onChange={onChange}
          error={errors.expiryDate}
          required
        />

        <div className="form-field">
          <label className="form-label" htmlFor="categoryId">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            className="form-input"
            value={form.categoryId}
            onChange={onChange}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showImageField && onImageChange && (
        <div className="listing-editor__image-section">
          <div className="listing-editor__image-preview">
            <img
              src={imagePreviewSrc}
              alt={form.title || 'Listing preview'}
              onError={(event) => {
                event.currentTarget.src = LISTING_PLACEHOLDER_IMAGE
              }}
            />
          </div>

          <div className="listing-editor__image-controls">
            <p className="listing-editor__field-note">Listing image (optional)</p>
            <p className="listing-editor__field-note listing-editor__field-note--subtle">
              Add a photo to help recipients recognize the listing more quickly.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="listing-editor__file-input"
              onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
            />
            <div className="listing-editor__file-row">
              <Button type="button" variant="outline" onClick={openFilePicker}>
                Choose image
              </Button>
              <span className="listing-editor__file-name">
                {selectedImageName || 'No file selected'}
              </span>
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="form-error">{submitError}</p>}

      <div className="listing-editor__actions">
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  )
}

export default ListingForm
