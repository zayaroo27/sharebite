import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import { login } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'

function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
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
      navigate(from, { replace: true })
    } catch (error) {
      setSubmitError('Unable to log in. Please check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="card card--elevated">
        <header className="card__header">
          <h1 className="card__title">Welcome back</h1>
          <p className="card__subtitle">
            Log in to ShareBite to connect surplus food from donors with people
            and communities who need it.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <TextInput
            id="username"
            name="username"
            label="Username or email"
            value={form.username}
            onChange={handleChange}
            placeholder="your_username or you@example.com"
            error={errors.username}
            required
          />

          <TextInput
            id="password"
            name="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={errors.password}
            required
          />

          {submitError && <p className="form-error">{submitError}</p>}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="form-helper" style={{ marginTop: '0.75rem' }}>
          New to ShareBite?{' '}
          <Link to="/register">Create an account</Link>.
        </p>
      </div>
    </section>
  )
}

export default LoginPage
