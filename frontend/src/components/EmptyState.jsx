function EmptyState({ title, message, action, icon }) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        paddingTop: '2rem',
        paddingBottom: '2rem',
      }}
    >
      {icon && (
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      )}
      {title && <h2>{title}</h2>}
      {message && (
        <p style={{ marginTop: '0.25rem' }} className="donor-dashboard__subtitle">
          {message}
        </p>
      )}
      {action && (
        <div style={{ marginTop: '1rem' }}>
          {action}
        </div>
      )}
    </div>
  )
}

export default EmptyState
