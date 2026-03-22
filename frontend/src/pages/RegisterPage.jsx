import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import TextInput from '../components/TextInput.jsx'
import Button from '../components/Button.jsx'
import { register } from '../services/authService.js'
import { useAuth } from '../hooks/useAuth.js'

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
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    const newErrors = {}
    if (!form.username) newErrors.username = 'Username is required.'
    if (!form.email) newErrors.email = 'Email is required.'
    if (!form.password) newErrors.password = 'Password is required.'
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
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError('Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="card card--elevated">
        <header className="card__header">
          <h1 className="card__title">Join ShareBite</h1>
          <p className="card__subtitle">
            Create an account to share surplus food as a donor or receive
            support as a recipient. Together, we reduce waste and fight hunger.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <TextInput
            id="username"
            name="username"
            label="Username"
            value={form.username}
            onChange={handleChange}
            placeholder="alex_chen"
            error={errors.username}
            required
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
          />

          <TextInput
            id="password"
            name="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a secure password"
            error={errors.password}
            required
          />

          <div className="form-field">
            <span className="form-label">How will you use ShareBite?</span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                type="button"
                variant={form.role === 'DONOR' ? 'primary' : 'outline'}
                onClick={() => setForm((prev) => ({ ...prev, role: 'DONOR' }))}
                aria-pressed={form.role === 'DONOR'}
              >
                Donor
              </Button>
              <Button
                type="button"
                variant={form.role === 'RECIPIENT' ? 'primary' : 'outline'}
                onClick={() => setForm((prev) => ({ ...prev, role: 'RECIPIENT' }))}
                aria-pressed={form.role === 'RECIPIENT'}
              >
                Recipient
              </Button>
              <Button
                type="button"
                variant={form.role === 'ADMIN' ? 'primary' : 'outline'}
                onClick={() => setForm((prev) => ({ ...prev, role: 'ADMIN' }))}
                aria-pressed={form.role === 'ADMIN'}
              >
                Admin
              </Button>
            </div>
            {errors.role && <p className="form-error">{errors.role}</p>}
          </div>

          {submitError && <p className="form-error">{submitError}</p>}

          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Creating your account...' : 'Create account'}
          </Button>
        </form>

        <p className="form-helper" style={{ marginTop: '0.75rem' }}>
          Already have an account? <Link to="/login">Log in</Link>.
        </p>
      </div>
    </section>
  )
}

export default RegisterPage
