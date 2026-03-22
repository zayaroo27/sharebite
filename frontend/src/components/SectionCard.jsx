function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <article className={`card ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <header
          style={{
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <div>
            {title && <h2 className="donor-dashboard__section-title">{title}</h2>}
            {subtitle && (
              <p className="donor-dashboard__subtitle">{subtitle}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}
      {children}
    </article>
  )
}

export default SectionCard
