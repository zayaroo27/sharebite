import { useEffect, useState } from 'react'
import Button from './Button.jsx'
import SelectInput from './SelectInput.jsx'
import '../styles/report-modal.css'

const POLICY_OPTIONS = [
  { value: 'OTHER', label: 'Other concern' },
  { value: 'MISLEADING_LISTING', label: 'Misleading listing' },
  { value: 'SAFETY_RISK', label: 'Safety risk' },
  { value: 'ABUSE', label: 'Abuse' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM_FRAUD', label: 'Scam or fraud' },
]

const SEVERITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

function ReportModal({
  isOpen,
  title,
  subtitle,
  targetLabel,
  reportedMessage = null,
  submitting = false,
  submitError = '',
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [policyCategory, setPolicyCategory] = useState('OTHER')
  const [severity, setSeverity] = useState('MEDIUM')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setDetails('')
      setPolicyCategory('OTHER')
      setSeverity('MEDIUM')
      setErrors({})
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!reason.trim()) {
      nextErrors.reason = 'Please provide a reason for this report.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      reason: reason.trim(),
      details: details.trim(),
      policyCategory,
      severity,
    })
  }

  return (
    <div className="report-modal__backdrop" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="report-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="report-modal__header">
          <div>
            <h2 id="report-modal-title">{title}</h2>
            {subtitle && <p className="report-modal__subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="report-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close report form"
          >
            ×
          </button>
        </div>

        {targetLabel && (
          <div className="report-modal__target">
            <span className="report-modal__target-label">Reporting</span>
            <strong>{targetLabel}</strong>
          </div>
        )}

        {reportedMessage && (
          <div className="report-modal__target report-modal__target--message">
            <span className="report-modal__target-label">Reported message</span>
            <strong>{reportedMessage.senderUsername || 'Unknown sender'}</strong>
            <p>{reportedMessage.content || 'No message text available.'}</p>
            {reportedMessage.timestamp && <time>{new Date(reportedMessage.timestamp).toLocaleString()}</time>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-modal__form">
          <SelectInput
            id="report-policy-category"
            label="Policy category"
            value={policyCategory}
            onChange={(event) => setPolicyCategory(event.target.value)}
            options={POLICY_OPTIONS}
            helperText="Classify the type of issue so admins can triage it faster."
            disabled={submitting}
            required
          />

          <SelectInput
            id="report-severity"
            label="Severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            options={SEVERITY_OPTIONS}
            helperText="Describe how urgent or harmful this issue appears to be."
            disabled={submitting}
            required
          />

          <div className="form-field">
            <label className="form-label" htmlFor="report-reason">
              Reason <span aria-hidden="true">*</span>
            </label>
            <input
              id="report-reason"
              className={`form-input ${errors.reason ? 'form-input--error' : ''}`.trim()}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Briefly explain what is wrong"
              maxLength={500}
              disabled={submitting}
              required
            />
            {errors.reason && <p className="form-error">{errors.reason}</p>}
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="report-details">Details (optional)</label>
            <textarea
              id="report-details"
              className="form-input report-modal__textarea"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Add any context that would help an admin review this fairly"
              maxLength={4000}
              rows={6}
              disabled={submitting}
            />
            <p className="form-helper">
              Include context, timestamps, and why this breaks ShareBite rules.
            </p>
          </div>

          {submitError && <p className="form-error">{submitError}</p>}

          <div className="report-modal__actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportModal
