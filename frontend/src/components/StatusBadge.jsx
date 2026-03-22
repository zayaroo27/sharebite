function getBadgeClass(variant) {
  if (variant === 'success') return 'badge badge-success'
  if (variant === 'warning') return 'badge badge-warning'
  if (variant === 'error') return 'badge badge-error'
  if (variant === 'completed') return 'badge badge-completed'
  if (variant === 'info') return 'badge badge-info'
  return 'badge'
}

function mapStatusToVariant(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'approved' || normalized === 'active') return 'success'
  if (normalized === 'pending') return 'warning'
  if (normalized === 'rejected' || normalized === 'suspended') return 'error'
  if (normalized === 'completed') return 'completed'
  return 'info'
}

function StatusBadge({ status, variant, children, className = '', ...props }) {
  const resolvedVariant = variant || mapStatusToVariant(status)
  const badgeClass = `${getBadgeClass(resolvedVariant)} ${className}`.trim()
  const label = children || status

  return (
    <span className={badgeClass} {...props}>
      {label}
    </span>
  )
}

export default StatusBadge
