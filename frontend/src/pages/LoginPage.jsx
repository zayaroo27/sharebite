import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import AuthSuccessModal from '../components/AuthSuccessModal.jsx'
import { login } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'

function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useAuth()

  const from = location.state?.from?.pathname || '/'

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.username) newErrors.username = 'Username or email is required.'
    if (!form.password) newErrors.password = 'Password is required.'
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
      const data = await login(form)
      setUser(data.user ?? data)
      setSuccessOpen(true)
    } catch (error) {
      setSubmitError('Unable to log in. Please check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuccessClose = () => {
    setSuccessOpen(false)
    navigate(from, { replace: true })
  }

  return (
    <>
      <section className="auth-page auth-page--login">
        <div className="card card--elevated auth-card">
          <header className="card__header auth-card__header">
            <span className="auth-card__eyebrow">Share surplus food with confidence</span>
            <h1 className="card__title auth-card__title">Welcome back</h1>
            <p className="card__subtitle auth-card__subtitle">
              Log in to ShareBite to manage food listings, requests, and conversations with your community.
            </p>
          </header>

          <div className="auth-card__divider" aria-hidden="true" />

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <TextInput
              id="username"
              name="username"
              label="Username or email"
              value={form.username}
              onChange={handleChange}
              placeholder="your_username or you@example.com"
              error={errors.username}
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
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                required
              />
              {errors.password && (
                <p id="password-error" className="form-error">
                  {errors.password}
                </p>
              )}
            </div>

            {submitError && <p className="form-error">{submitError}</p>}

            <Button
              type="submit"
              variant="primary"
              className="w-full auth-card__submit"
              disabled={submitting}
            >
              {submitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <footer className="auth-card__footer">
            <p className="form-helper auth-card__footer-copy">
              New to ShareBite?
            </p>
            <Link className="auth-card__footer-link" to="/register">
              Create an account
            </Link>
          </footer>
        </div>
      </section>

      <AuthSuccessModal
        isOpen={successOpen}
        title="Login successful"
        message="You have logged in successfully. Press Continue to enter your ShareBite session."
        confirmLabel="Continue"
        onConfirm={handleSuccessClose}
      />
    </>
  )
}

export default LoginPage
