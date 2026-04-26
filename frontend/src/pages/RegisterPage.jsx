import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import AuthSuccessModal from '../components/AuthSuccessModal.jsx'
import { register } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'

const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.'

function getPasswordValidationMessage(password) {
  if (!password) return 'Password is required.'
  if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
    return PASSWORD_RULE_MESSAGE
  }
  return ''
}

function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RECIPIENT',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'password') {
      setErrors((prev) => {
        if (!prev.password) return prev
        return { ...prev, password: getPasswordValidationMessage(value) }
      })
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!form.username) newErrors.username = 'Username is required.'
    if (!form.email) newErrors.email = 'Email is required.'
    const passwordError = getPasswordValidationMessage(form.password)
    if (passwordError) newErrors.password = passwordError
    if (!form.role) newErrors.role = 'Please select a role.'
    return newErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const data = await register(form)
      setUser(data.user ?? data)
      setSuccessOpen(true)
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message || 'Unable to create your account. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuccessClose = () => {
    setSuccessOpen(false)
    navigate('/', { replace: true })
  }

  return (
    <>
      <section className="auth-page auth-page--register">
        <div className="card card--elevated auth-card auth-card--wide">
          <header className="card__header auth-card__header">
            <span className="auth-card__eyebrow">Create your ShareBite account</span>
            <h1 className="card__title auth-card__title">Join ShareBite</h1>
            <p className="card__subtitle auth-card__subtitle">
              Create an account to share surplus food as a donor or request support as a recipient.
            </p>
          </header>

          <div className="auth-card__divider" aria-hidden="true" />

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <TextInput
              id="username"
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              placeholder="alex_chen"
              error={errors.username}
              required
              showRequiredMark={false}
            />

            <TextInput
              id="email"
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              error={errors.email}
              required
              showRequiredMark={false}
            />

            <div className="form-field">
              <div className="auth-form__label-row">
                <label className="form-label" htmlFor="password">
                  Password 
                </label>
                <button
                  type="button"
                  className="auth-form__toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span aria-hidden="true">{showPassword ? '◉' : '○'}</span>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'form-input--error' : ''}`.trim()}
                value={form.password}
                onChange={handleChange}
                placeholder="Create a secure password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : 'password-helper'}
                required
              />
              <p id="password-helper" className="form-helper">
                At least 8 characters, including one uppercase letter, one number, and one special character.
              </p>
              {errors.password && (
                <p id="password-error" className="form-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="form-field auth-form__role-field">
              <span className="form-label">How will you use ShareBite?</span>
              <div className="auth-role-toggle" role="group" aria-label="Select account role">
                <button
                  type="button"
                  className={`auth-role-toggle__option ${form.role === 'DONOR' ? 'auth-role-toggle__option--active' : ''}`.trim()}
                  onClick={() => setForm((prev) => ({ ...prev, role: 'DONOR' }))}
                  aria-pressed={form.role === 'DONOR'}
                >
                  <span className="auth-role-toggle__title">Donor</span>
                  <span className="auth-role-toggle__description">
                    Share surplus food with nearby recipients.
                  </span>
                </button>
                <button
                  type="button"
                  className={`auth-role-toggle__option ${form.role === 'RECIPIENT' ? 'auth-role-toggle__option--active' : ''}`.trim()}
                  onClick={() => setForm((prev) => ({ ...prev, role: 'RECIPIENT' }))}
                  aria-pressed={form.role === 'RECIPIENT'}
                >
                  <span className="auth-role-toggle__title">Recipient</span>
                  <span className="auth-role-toggle__description">
                    Request available food that fits your needs.
                  </span>
                </button>
              </div>
              {errors.role && <p className="form-error">{errors.role}</p>}
            </div>

            {submitError && <p className="form-error">{submitError}</p>}

            <Button
              type="submit"
              variant="primary"
              className="w-full auth-card__submit"
              disabled={submitting}
            >
              {submitting ? 'Creating your account...' : 'Create account'}
            </Button>
          </form>

          <footer className="auth-card__footer">
            <p className="form-helper auth-card__footer-copy">
              Already have an account?
            </p>
            <Link className="auth-card__footer-link" to="/login">
              Log in
            </Link>
          </footer>
        </div>
      </section>

      <AuthSuccessModal
        isOpen={successOpen}
        title="Registration successful"
        message="Your ShareBite account has been created successfully. Press Continue to proceed."
        confirmLabel="Continue"
        onConfirm={handleSuccessClose}
      />
    </>
  )
}

export default RegisterPage
