function TextInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required,
  showRequiredMark = true,
  ...props
}) {
  const inputClass = [
    'form-input',
    error ? 'form-input--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && showRequiredMark && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={inputClass}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        required={required}
        {...props}
      />
      {helperText && !error && (
        <p id={`${id}-helper`} className="form-helper">
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="form-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default TextInput
