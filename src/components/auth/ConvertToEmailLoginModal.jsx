import { useEffect, useState } from 'react'
import SignupFormRow from '@/components/signup/SignupFormRow'
import { AUTOCOMPLETE_OFF, PASSWORD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  checkEmailAvailableForConversion,
  completeKakaoToEmailConversion,
  getConversionEmailVerificationState,
  sendConversionEmailVerification,
  verifyCredentialsForConversion,
} from '@/services/auth/convertToEmailLogin'
import { peekEmailVerifiedBeacon, subscribeEmailVerified } from '@/utils/signupDraft'
import './DeleteAccountModal.css'
import '@/pages/Signup.css'

const STEPS = {
  CREDENTIALS: 'credentials',
  EMAIL: 'email',
  VERIFY: 'verify',
}

function ConvertToEmailLoginModal({
  isOpen,
  currentUserId,
  currentUsername = '',
  defaultEmail = '',
  hasGeneralLogin = true,
  onCancel,
  onCompleted,
}) {
  const [step, setStep] = useState(STEPS.CREDENTIALS)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [verifiedEmail, setVerifiedEmail] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setStep(STEPS.CREDENTIALS)
    setLoginId(currentUsername)
    setPassword('')
    setEmail(defaultEmail)
    setErrors({})
    setFeedback(null)
    setIsSubmitting(false)
    setIsCheckingEmail(false)
    setVerifiedEmail('')
  }, [isOpen, currentUsername, defaultEmail])

  useEffect(() => {
    if (!isOpen || step !== STEPS.VERIFY || !verifiedEmail) {
      return undefined
    }

    const handleVerified = async (verifiedAddress) => {
      if (verifiedAddress !== verifiedEmail.trim().toLowerCase()) {
        return
      }

      const state = await getConversionEmailVerificationState(verifiedEmail)

      if (state.verified) {
        setFeedback({
          type: 'success',
          message: '이메일 인증이 완료되었습니다. 전환을 진행합니다.',
        })
        await runConversion()
      }
    }

    const unsubscribe = subscribeEmailVerified(handleVerified)

    const pollId = window.setInterval(async () => {
      if (peekEmailVerifiedBeacon(verifiedEmail)) {
        await handleVerified(verifiedEmail.trim().toLowerCase())
        return
      }

      const state = await getConversionEmailVerificationState(verifiedEmail)

      if (state.verified) {
        await handleVerified(verifiedEmail.trim().toLowerCase())
      }
    }, 2000)

    return () => {
      unsubscribe()
      window.clearInterval(pollId)
    }
  }, [isOpen, step, verifiedEmail])

  if (!isOpen) {
    return null
  }

  const runConversion = async (targetEmail = verifiedEmail) => {
    setIsSubmitting(true)
    setFeedback(null)

    const result = await completeKakaoToEmailConversion(targetEmail)

    if (!result.success) {
      setFeedback({
        type: 'error',
        message: result.message,
      })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onCompleted?.(result)
  }

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault()
    setFeedback(null)
    setErrors({})

    if (!hasGeneralLogin) {
      setFeedback({
        type: 'error',
        message:
          '비밀번호가 설정되지 않은 카카오 전용 계정입니다.\n먼저 일반 로그인 계정을 등록한 뒤 다시 시도해주세요.',
      })
      return
    }

    setIsSubmitting(true)

    const result = await verifyCredentialsForConversion({
      loginId,
      password,
      currentUserId,
      currentUsername,
    })

    if (!result.success) {
      setErrors({
        loginId: result.code === 'invalid_credentials' ? undefined : result.message,
        password: result.code === 'invalid_credentials' ? result.message : undefined,
      })
      setFeedback({
        type: 'error',
        message: result.message,
      })
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setStep(STEPS.EMAIL)
  }

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setFeedback(null)
    setErrors({})

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      setErrors({ email: '이메일을 입력해주세요.' })
      return
    }

    setIsSubmitting(true)

    const availability = await checkEmailAvailableForConversion(trimmedEmail, currentUserId)

    if (!availability.available) {
      setErrors({ email: availability.message })
      setFeedback({ type: 'error', message: availability.message })
      setIsSubmitting(false)
      return
    }

    const sendResult = await sendConversionEmailVerification(trimmedEmail)

    if (!sendResult.success) {
      setErrors({ email: sendResult.message })
      setFeedback({ type: 'error', message: sendResult.message })
      setIsSubmitting(false)
      return
    }

    setVerifiedEmail(trimmedEmail)

    if (sendResult.alreadyVerified) {
      setFeedback({
        type: 'success',
        message: sendResult.message,
      })
      await runConversion()
      return
    }

    setFeedback({
      type: 'success',
      message: sendResult.message,
    })
    setIsSubmitting(false)
    setStep(STEPS.VERIFY)
  }

  const handleRecheckVerification = async () => {
    if (!verifiedEmail) {
      return
    }

    setIsCheckingEmail(true)
    setFeedback(null)

    const state = await getConversionEmailVerificationState(verifiedEmail)

    if (state.verified) {
      setFeedback({
        type: 'success',
        message: '이메일 인증이 완료되었습니다. 전환을 진행합니다.',
      })
      setIsCheckingEmail(false)
      await runConversion()
      return
    }

    setFeedback({
      type: 'error',
      message: '아직 이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해주세요.',
    })
    setIsCheckingEmail(false)
  }

  const handleResendVerification = async () => {
    if (!verifiedEmail) {
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    const sendResult = await sendConversionEmailVerification(verifiedEmail)

    if (!sendResult.success) {
      setFeedback({ type: 'error', message: sendResult.message })
      setIsSubmitting(false)
      return
    }

    if (sendResult.alreadyVerified) {
      setFeedback({ type: 'success', message: sendResult.message })
      setIsSubmitting(false)
      await runConversion()
      return
    }

    setFeedback({ type: 'success', message: sendResult.message })
    setIsSubmitting(false)
  }

  return (
    <div className="delete-account-modal" role="presentation">
      <div
        className="delete-account-modal__dialog delete-account-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-email-login-modal-title"
      >
        <h2 id="convert-email-login-modal-title" className="delete-account-modal__title">
          이메일 로그인으로 전환
        </h2>

        {step === STEPS.CREDENTIALS && (
          <form className="signup-info-form" onSubmit={handleCredentialsSubmit} noValidate>
            <p className="delete-account-modal__description" style={{ marginTop: 0 }}>
              이메일 로그인으로 전환하기 위해
              {'\n'}
              현재 계정의 아이디와 비밀번호를 확인해주세요.
            </p>

            <div className="signup-info-form__panel" style={{ marginTop: '1rem', boxShadow: 'none' }}>
              <SignupFormRow
                label="현재 아이디"
                required
                htmlFor="convert-login-id"
                error={errors.loginId}
              >
                <input
                  id="convert-login-id"
                  name="loginId"
                  type="text"
                  className="signup-info-form__input"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                  disabled={isSubmitting}
                />
              </SignupFormRow>

              <SignupFormRow
                label="현재 비밀번호"
                required
                htmlFor="convert-login-password"
                error={errors.password}
              >
                <input
                  id="convert-login-password"
                  name="password"
                  type="password"
                  className="signup-info-form__input"
                  placeholder="현재 비밀번호"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={PASSWORD_AUTOCOMPLETE_OFF}
                  disabled={isSubmitting}
                />
              </SignupFormRow>
            </div>

            {feedback && (
              <p
                className={`signup-form__feedback signup-form__feedback--${feedback.type}`}
                role={feedback.type === 'error' ? 'alert' : 'status'}
                style={{ whiteSpace: 'pre-line' }}
              >
                {feedback.message}
              </p>
            )}

            <div className="delete-account-modal__actions">
              <button
                type="button"
                className="signup-btn signup-btn--secondary signup-btn--full"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="signup-btn signup-btn--primary signup-btn--full"
                disabled={isSubmitting}
              >
                {isSubmitting ? '확인 중...' : '다음'}
              </button>
            </div>
          </form>
        )}

        {step === STEPS.EMAIL && (
          <form className="signup-info-form" onSubmit={handleEmailSubmit} noValidate>
            <p className="delete-account-modal__description" style={{ marginTop: 0 }}>
              이메일 로그인에 사용할 이메일 주소를 입력해주세요.
            </p>

            <div className="signup-info-form__panel" style={{ marginTop: '1rem', boxShadow: 'none' }}>
              <SignupFormRow
                label="이메일"
                required
                htmlFor="convert-email"
                error={errors.email}
              >
                <input
                  id="convert-email"
                  name="email"
                  type="email"
                  className="signup-info-form__input"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                  disabled={isSubmitting}
                />
              </SignupFormRow>
            </div>

            {feedback && (
              <p
                className={`signup-form__feedback signup-form__feedback--${feedback.type}`}
                role={feedback.type === 'error' ? 'alert' : 'status'}
                style={{ whiteSpace: 'pre-line' }}
              >
                {feedback.message}
              </p>
            )}

            <div className="delete-account-modal__actions">
              <button
                type="button"
                className="signup-btn signup-btn--secondary signup-btn--full"
                onClick={() => {
                  setStep(STEPS.CREDENTIALS)
                  setFeedback(null)
                  setErrors({})
                }}
                disabled={isSubmitting}
              >
                이전
              </button>
              <button
                type="submit"
                className="signup-btn signup-btn--primary signup-btn--full"
                disabled={isSubmitting}
              >
                {isSubmitting ? '처리 중...' : '인증 메일 발송'}
              </button>
            </div>
          </form>
        )}

        {step === STEPS.VERIFY && (
          <div className="signup-info-form">
            <p className="delete-account-modal__description" style={{ marginTop: 0 }}>
              입력하신 이메일 주소로 인증 메일을 보냈습니다.
              {'\n'}
              메일의 인증 링크를 눌러 인증을 완료해주세요.
            </p>

            <p className="member-account-section__hint" style={{ marginTop: '1rem' }}>
              인증 대상: {verifiedEmail}
            </p>

            {feedback && (
              <p
                className={`signup-form__feedback signup-form__feedback--${feedback.type}`}
                role={feedback.type === 'error' ? 'alert' : 'status'}
                style={{ whiteSpace: 'pre-line' }}
              >
                {feedback.message}
              </p>
            )}

            <div className="delete-account-modal__actions">
              <button
                type="button"
                className="signup-btn signup-btn--secondary signup-btn--full"
                onClick={onCancel}
                disabled={isSubmitting || isCheckingEmail}
              >
                취소
              </button>
              <button
                type="button"
                className="signup-btn signup-btn--gray signup-btn--full"
                onClick={handleRecheckVerification}
                disabled={isSubmitting || isCheckingEmail}
              >
                {isCheckingEmail ? '확인 중...' : '인증 완료 확인'}
              </button>
              <button
                type="button"
                className="signup-btn signup-btn--primary signup-btn--full"
                onClick={handleResendVerification}
                disabled={isSubmitting || isCheckingEmail}
              >
                {isSubmitting ? '발송 중...' : '인증 메일 재발송'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConvertToEmailLoginModal
