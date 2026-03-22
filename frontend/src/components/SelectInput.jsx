function SelectInput({
  id,
  label,
  value,
  onChange,
  options = [],
  error,
  helperText,
  required,
  ...props
}) {
  const selectClass = [
    'form-select',
    error ? 'form-select--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        required={required}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

export default SelectInput
