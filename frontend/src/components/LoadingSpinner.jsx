function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 0',
        gap: '0.5rem',
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        style={{
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '999px',
          border: '3px solid rgba(38, 50, 56, 0.15)',
          borderTopColor: 'var(--sb-color-primary)',
          animation: 'sb-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.85rem', color: 'var(--sb-color-text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

export default LoadingSpinner
