import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import {
  fetchPasswordRecoveryQuestion,
  verifyPasswordRecoveryAnswer,
} from '@/services/auth/securityRecovery'
import {
  getPasswordResetSession,
  setPasswordResetSecurityVerified,
} from '@/utils/passwordResetSession'
import {
  clearSecurityAnswerFailures,
  getSecurityAnswerLockStatus,
  recordSecurityAnswerFailure,
} from '@/utils/securityAnswerRateLimit'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import '@/pages/Auth.css'
import '@/pages/Signup.css'

function ResetPasswordSecurityQuestion() {
  const navigate = useNavigate()
  const location = useLocation()
  const [verification, setVerification] = useState(null)
  const [questionLabel, setQuestionLabel] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerError, setAnswerError] = useState('')
  const [formFeedback, setFormFeedback] = useState(null)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockMessage, setLockMessage] = useState('')

  const applyLockStatus = (identityKey) => {
    const status = getSecurityAnswerLockStatus(identityKey)
    setIsLocked(Boolean(status.locked))
    setLockMessage(status.locked ? status.message || AUTH_MESSAGES.securityAnswerLocked : '')
    return status
  }

  useEffect(() => {
    const stateVerification = location.state?.email
      ? {
          email: location.state.email,
          name: location.state.name,
          loginId: location.state.loginId || '',
        }
      : null

    const sessionVerification = getPasswordResetSession()
    const nextVerification = stateVerification ?? sessionVerification

    if (!nextVerification?.email || !nextVerification?.name) {
      navigate('/login?tab=find-password', { replace: true })
      return
    }

    if (sessionVerification?.securityVerified) {
      navigate('/reset-password/email-verify', { replace: true })
      return
    }

    setVerification(nextVerification)
    applyLockStatus(nextVerification.email || nextVerification.loginId)

    let cancelled = false

    async function loadQuestion() {
      setIsLoadingQuestion(true)
      setFormFeedback(null)

      const result = await fetchPasswordRecoveryQuestion({
        name: nextVerification.name,
        email: nextVerification.email,
      })

      if (cancelled) {
        return
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        setQuestionLabel('')
        setIsLoadingQuestion(false)
        return
      }

      setQuestionLabel(result.questionLabel)
      setIsLoadingQuestion(false)
    }

    loadQuestion()

    return () => {
      cancelled = true
    }
  }, [location.state, navigate])

  useEffect(() => {
    if (!verification || !isLocked) {
      return undefined
    }

    const timer = window.setInterval(() => {
      const status = applyLockStatus(verification.email || verification.loginId)
      if (!status.locked) {
        setFormFeedback(null)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [verification, isLocked])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!verification || !questionLabel) {
      return
    }

    const identityKey = verification.email || verification.loginId
    const lockStatus = applyLockStatus(identityKey)

    if (lockStatus.locked) {
      setFormFeedback({
        type: 'error',
        message: lockStatus.message || AUTH_MESSAGES.securityAnswerLocked,
      })
      return
    }

    const trimmedAnswer = answer.trim()

    if (!trimmedAnswer) {
      setAnswerError('답변을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setAnswerError('')
    setFormFeedback(null)

    try {
      // normalizeAnswer 는 verifyPasswordRecoveryAnswer 내부에서 재사용됩니다.
      const result = await verifyPasswordRecoveryAnswer({
        name: verification.name,
        email: verification.email,
        answer: trimmedAnswer,
      })

      if (!result.success) {
        const nextLock = recordSecurityAnswerFailure(identityKey)
        setIsLocked(Boolean(nextLock.locked))
        setLockMessage(nextLock.locked ? nextLock.message || AUTH_MESSAGES.securityAnswerLocked : '')

        setFormFeedback({
          type: 'error',
          message: nextLock.locked
            ? nextLock.message || AUTH_MESSAGES.securityAnswerLocked
            : result.message || AUTH_MESSAGES.securityAnswerMismatch,
        })
        return
      }

      clearSecurityAnswerFailures(identityKey)
      setPasswordResetSecurityVerified()
      // 답변 원문은 상태에만 잠시 두고, 다음 단계로 이동 시 화면/스토리지에 저장하지 않습니다.
      setAnswer('')
      navigate('/reset-password/email-verify', { replace: true })
    } catch {
      setFormFeedback({
        type: 'error',
        message: '답변 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!verification) {
    return null
  }

  const answerInputDisabled =
    !questionLabel || isLoadingQuestion || isLocked || isSubmitting

  return (
    <div className="category-layout auth-page">
      <div className="category-layout__inner">
        <div className="category-layout__main auth-page__main" style={{ margin: '0 auto', maxWidth: '760px' }}>
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">비밀번호 찾기</h1>
              <p className="sub-layout__subtitle">
                회원가입 시 등록한 보안 질문에 답변한 뒤에만 새 비밀번호를 설정할 수 있습니다.
              </p>
            </div>
            <AuthBreadcrumb label="비밀번호 찾기" />
          </div>

          <div className="auth-page__body">
            <form className="auth-sub-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              {verification.loginId ? (
                <div className="auth-form__field">
                  <label className="auth-form__field-label" htmlFor="reset-login-id">
                    아이디
                  </label>
                  <input
                    id="reset-login-id"
                    type="text"
                    className="auth-form__input"
                    value={verification.loginId}
                    readOnly
                    disabled
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <div className="auth-form__field">
                <label className="auth-form__field-label" htmlFor="reset-security-question">
                  비밀번호 분실 시 질문
                </label>
                {isLoadingQuestion ? (
                  <p className="auth-form__field-hint">질문을 불러오는 중...</p>
                ) : questionLabel ? (
                  <p className="auth-form__question-text" id="reset-security-question">
                    {questionLabel}
                  </p>
                ) : (
                  <p className="auth-form__feedback auth-form__feedback--error" role="alert">
                    {AUTH_MESSAGES.securityQuestionMissing}
                  </p>
                )}
              </div>

              <div className="auth-form__field">
                <label className="auth-form__field-label" htmlFor="reset-security-answer">
                  보안 답변
                </label>
                <input
                  id="reset-security-answer"
                  name="securityAnswer"
                  type="text"
                  className="auth-form__input"
                  placeholder="회원가입 시 입력한 답변을 입력하세요."
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value)
                    setAnswerError('')
                    setFormFeedback(null)
                  }}
                  disabled={answerInputDisabled}
                  autoComplete="off"
                  aria-label="비밀번호 분실 시 답변"
                />
              </div>

              {answerError && (
                <p className="auth-form__feedback auth-form__feedback--error" role="alert">
                  {answerError}
                </p>
              )}

              {(formFeedback || (isLocked && lockMessage)) && (
                <p
                  className="auth-form__feedback auth-form__feedback--error auth-form__feedback--multiline"
                  role="alert"
                >
                  {isLocked ? lockMessage : formFeedback?.message}
                </p>
              )}

              <button
                type="submit"
                className="auth-sub-form__submit"
                disabled={isSubmitting || isLoadingQuestion || !questionLabel || isLocked}
              >
                {isSubmitting ? '확인 중...' : '답변 확인'}
              </button>

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

export default ResetPasswordSecurityQuestion
