import '../styles/avatar.css'

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function Avatar({ name, imageUrl, size = 40, className = '' }) {
  return (
    <span
      className={`sb-avatar ${className}`.trim()}
      style={{ '--sb-avatar-size': `${size}px` }}
      aria-hidden="true"
    >
      {imageUrl ? (
        <img className="sb-avatar__image" src={imageUrl} alt="" />
      ) : (
        <span className="sb-avatar__fallback">{getInitials(name)}</span>
      )}
    </span>
  )
}

export default Avatar
