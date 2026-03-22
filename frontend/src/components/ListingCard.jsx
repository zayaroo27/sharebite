import '../styles/listings.css'

function ListingCard({ listing, onClick }) {
  if (!listing) return null

  const { id, title, imageUrl, quantity, category, location, expiryDate } =
    listing

  return (
    <article
      className="card listing-card"
      onClick={onClick ? () => onClick(id) : undefined}
    >
      {imageUrl && (
        <div className="listing-card__image-wrapper">
          <img src={imageUrl} alt={title} />
        </div>
      )}

      <div className="listing-card__title-row">
        <div>
          <h2 className="listing-card__title">{title}</h2>
          {category && (
            <span className="badge badge-category">{category}</span>
          )}
        </div>
        {quantity && <span className="badge badge-quantity">{quantity}</span>}
      </div>

      <div className="listing-card__meta">
        {location && (
          <span className="listing-card__meta-item">
            <span aria-hidden="true">📍</span>
            <span>{location}</span>
          </span>
        )}
        {expiryDate && (
          <span className="listing-card__meta-item">
            <span aria-hidden="true">⏰</span>
            <span>Use by {expiryDate}</span>
          </span>
        )}
      </div>
    </article>
  )
}

export default ListingCard
