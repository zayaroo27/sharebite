import Button from './Button.jsx'
import '../styles/auth-success-modal.css'

function AuthSuccessModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Continue',
  onConfirm,
}) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm?.()
  }

  return (
    <div className="auth-success-modal__backdrop" role="presentation">
      <div
        className="auth-success-modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-success-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-success-modal__icon" aria-hidden="true">
          ✓
        </div>

        <h2 id="auth-success-modal-title" className="auth-success-modal__title">
          {title}
        </h2>
        <p className="auth-success-modal__message">{message}</p>

        <div className="auth-success-modal__actions">
          <Button type="button" variant="primary" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AuthSuccessModal
