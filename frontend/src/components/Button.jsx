function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  const variantClass =
    variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'danger'
        ? 'btn-danger'
      : variant === 'ghost'
        ? 'btn-ghost'
      : variant === 'outline'
        ? 'btn-outline'
        : 'btn-primary'

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${className}`.trim()}
      {...props}
    />
  )
}

export default Button
