import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import {
  PASSWORD_RESET_EMAIL_RESEND_MESSAGE,
  sendPasswordResetEmailOtp,
  verifyPasswordResetEmailOtp,
} from '@/services/auth/passwordResetEmail'
import {
  getPasswordResetSession,
  setPasswordResetEmailVerified,
} from '@/utils/passwordResetSession'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import '@/pages/Auth.css'

const RESEND_COOLDOWN_SECONDS = 60

function ResetPasswordEmailVerify() {
  const navigate = useNavigate()
  const location = useLocation()
  const [verification, setVerification] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [formFeedback, setFormFeedback] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    const sessionVerification = getPasswordResetSession()

    if (!sessionVerification?.email || !sessionVerification?.name) {
      navigate('/login?tab=find-password', { replace: true })
      return
    }

    if (!sessionVerification.securityVerified) {
      navigate('/reset-password/security-question', { replace: true })
      return
    }

    if (sessionVerification.emailOtpVerified) {
      navigate('/reset-password', { replace: true })
      return
    }

    setVerification(sessionVerification)

    let cancelled = false

    async function sendInitialOtp() {
      setIsSending(true)
      setFormFeedback(null)

      const result = await sendPasswordResetEmailOtp(sessionVerification.email)

      if (cancelled) {
        return
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        setIsSending(false)
        return
      }

      setStatusMessage(result.message)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setIsSending(false)
    }

    sendInitialOtp()

    return () => {
      cancelled = true
    }
  }, [location.state, navigate])

  const handleResend = async () => {
    if (!verification || resendCooldown > 0 || isSending) {
      return
    }

    setIsSending(true)
    setFormFeedback(null)

    try {
      const result = await sendPasswordResetEmailOtp(verification.email)

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      setStatusMessage(PASSWORD_RESET_EMAIL_RESEND_MESSAGE)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!verification) {
      return
    }

    setIsSubmitting(true)
    setFormFeedback(null)

    try {
      const result = await verifyPasswordResetEmailOtp({
        email: verification.email,
        token: otpCode,
      })

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: AUTH_MESSAGES.emailVerificationFailed,
        })
        return
      }

      setPasswordResetEmailVerified()
      navigate('/reset-password', { replace: true })
    } catch {
      setFormFeedback({
        type: 'error',
        message: AUTH_MESSAGES.emailVerificationFailed,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!verification) {
    return null
  }

  return (
    <div className="category-layout auth-page">
      <div className="category-layout__inner">
        <div className="category-layout__main auth-page__main" style={{ margin: '0 auto', maxWidth: '760px' }}>
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">비밀번호 찾기</h1>
              <p className="sub-layout__subtitle">
                {verification.email}로 발송된 인증번호를 입력해주세요.
              </p>
            </div>
            <AuthBreadcrumb label="비밀번호 찾기" />
          </div>

          <div className="auth-page__body">
            <form className="auth-sub-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              {statusMessage && (
                <p className="auth-form__feedback auth-form__feedback--success auth-form__feedback--multiline">
                  {statusMessage}
                </p>
              )}

              <input
                name="otpCode"
                type="text"
                inputMode="numeric"
                className="auth-form__input"
                placeholder="인증번호 6자리"
                aria-label="이메일 인증번호"
                value={otpCode}
                onChange={(event) => {
                  setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setFormFeedback(null)
                }}
                autoComplete="one-time-code"
              />

              <button type="submit" className="auth-sub-form__submit" disabled={isSubmitting || isSending}>
                {isSubmitting ? '확인 중...' : '다음'}
              </button>

              <button
                type="button"
                className="auth-sub-form__secondary"
                onClick={handleResend}
                disabled={isSending || resendCooldown > 0}
              >
                {isSending
                  ? '발송 중...'
                  : resendCooldown > 0
                    ? `인증번호 재발송 (${resendCooldown})`
                    : '인증번호 재발송'}
              </button>

              {formFeedback && (
                <p
                  className={`auth-form__feedback auth-form__feedback--${formFeedback.type}`}
                  role={formFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {formFeedback.message}
                </p>
              )}

              <Link to="/login?tab=find-password" className="auth-page__footer-link auth-sub-form__back">
                처음으로
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordEmailVerify
