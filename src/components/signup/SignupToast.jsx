import { useEffect } from 'react'
import './SignupToast.css'

function SignupToast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (!message) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      onClose?.()
    }, 4500)

    return () => window.clearTimeout(timer)
  }, [message, onClose])

  if (!message) {
    return null
  }

  return (
    <div className="signup-toast" role={type === 'error' ? 'alert' : 'status'}>
      <p className={`signup-toast__message signup-toast__message--${type}`}>{message}</p>
      <button type="button" className="signup-toast__close" onClick={onClose} aria-label="닫기">
        ×
      </button>
    </div>
  )
}

export default SignupToast
