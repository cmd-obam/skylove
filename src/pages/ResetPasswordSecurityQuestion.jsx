import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import {
  fetchPasswordRecoveryQuestion,
  verifyPasswordRecoveryAnswer,
} from '@/services/auth/securityRecovery'
import {
  getPasswordResetSession,
  setPasswordResetSecurityVerified,
} from '@/utils/passwordResetSession'
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

  useEffect(() => {
    const stateVerification = location.state?.email
      ? {
          email: location.state.email,
          name: location.state.name,
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!verification || !questionLabel) {
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
      const result = await verifyPasswordRecoveryAnswer({
        name: verification.name,
        email: verification.email,
        answer: trimmedAnswer,
      })

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      setPasswordResetSecurityVerified()
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

  return (
    <div className="category-layout auth-page">
      <div className="category-layout__inner">
        <div className="category-layout__main auth-page__main" style={{ margin: '0 auto', maxWidth: '760px' }}>
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">비밀번호 찾기</h1>
              <p className="sub-layout__subtitle">
                회원가입 시 등록한 질문에 답변해주세요.
              </p>
            </div>
            <AuthBreadcrumb label="비밀번호 찾기" />
          </div>

          <div className="auth-page__body">
            <form className="auth-sub-form" onSubmit={handleSubmit} noValidate autoComplete="off">
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
                    등록된 비밀번호 찾기 질문이 없습니다.
                  </p>
                )}
              </div>

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
                disabled={!questionLabel || isLoadingQuestion}
                autoComplete="off"
                aria-label="비밀번호 분실 시 답변"
              />
              {answerError && (
                <p className="auth-form__feedback auth-form__feedback--error" role="alert">
                  {answerError}
                </p>
              )}

              {formFeedback && (
                <p
                  className={`auth-form__feedback auth-form__feedback--${formFeedback.type}`}
                  role={formFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {formFeedback.message}
                </p>
              )}

              <button
                type="submit"
                className="auth-sub-form__submit"
                disabled={isSubmitting || isLoadingQuestion || !questionLabel}
              >
                {isSubmitting ? '확인 중...' : '다음'}
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
