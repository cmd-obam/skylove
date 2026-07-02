import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import PasswordInput from '@/components/signup/PasswordInput'
import { resetPasswordByVerification } from '@/services/auth/passwordReset'
import {
  RESET_PASSWORD_HINT,
  RESET_PASSWORD_PLACEHOLDER,
} from '@/services/auth/passwordValidation'
import {
  clearPasswordResetSession,
  getPasswordResetSession,
} from '@/utils/passwordResetSession'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import '@/pages/Auth.css'
import '@/pages/Signup.css'

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [verification, setVerification] = useState(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formFeedback, setFormFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const stateVerification = location.state?.email
      ? {
          email: location.state.email,
          name: location.state.name,
        }
      : null

    const sessionVerification = getPasswordResetSession()
    const nextVerification = stateVerification
      ? {
          ...stateVerification,
          securityVerified: sessionVerification?.securityVerified ?? false,
          securityAnswer: sessionVerification?.securityAnswer ?? '',
        }
      : sessionVerification

    if (!nextVerification?.email || !nextVerification?.name) {
      navigate('/login?tab=find-password', { replace: true })
      return
    }

    if (!nextVerification.securityVerified) {
      navigate('/reset-password/security-question', { replace: true })
      return
    }

    setVerification(nextVerification)
  }, [location.state, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!verification) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setFormFeedback(null)

    try {
      const result = await resetPasswordByVerification({
        name: verification.name,
        email: verification.email,
        password,
        passwordConfirm,
        securityAnswer: verification.securityAnswer,
      })

      if (result.errors) {
        setErrors(result.errors)
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      clearPasswordResetSession()
      window.alert(result.message)
      navigate('/login', { replace: true })
    } catch {
      setFormFeedback({
        type: 'error',
        message: '비밀번호 변경 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
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
              <h1 className="sub-layout__title">비밀번호 재설정</h1>
              <p className="sub-layout__subtitle">새로운 비밀번호를 입력해 주세요.</p>
            </div>
            <AuthBreadcrumb label="비밀번호 재설정" />
          </div>

          <div className="auth-page__body">
            <form className="auth-login" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div className="signup-field-card">
                <div className="signup-field-card__header">
                  <span className="signup-field-card__label">새 비밀번호</span>
                </div>
                <div className="signup-field-card__body">
                  <PasswordInput
                    id="reset-password"
                    name="password"
                    placeholder={RESET_PASSWORD_PLACEHOLDER}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setErrors((prev) => ({ ...prev, password: undefined }))
                      setFormFeedback(null)
                    }}
                  />
                </div>
                {!errors.password && (
                  <p className="signup-field-card__hint">{RESET_PASSWORD_HINT}</p>
                )}
                {errors.password && (
                  <p className="signup-field-card__message signup-field-card__message--error" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="signup-field-card">
                <div className="signup-field-card__header">
                  <span className="signup-field-card__label">새 비밀번호 확인</span>
                </div>
                <div className="signup-field-card__body">
                  <PasswordInput
                    id="reset-password-confirm"
                    name="passwordConfirm"
                    placeholder="비밀번호를 다시 입력해주세요"
                    value={passwordConfirm}
                    onChange={(event) => {
                      setPasswordConfirm(event.target.value)
                      setErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
                      setFormFeedback(null)
                    }}
                  />
                </div>
                {errors.passwordConfirm && (
                  <p className="signup-field-card__message signup-field-card__message--error" role="alert">
                    {errors.passwordConfirm}
                  </p>
                )}
              </div>

              {formFeedback && (
                <p
                  className={`auth-form__feedback auth-form__feedback--${formFeedback.type}`}
                  role={formFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {formFeedback.message}
                </p>
              )}

              <button type="submit" className="auth-login__submit" disabled={isSubmitting}>
                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>

            <nav className="auth-page__footer">
              <Link to="/login" className="auth-page__footer-link">
                로그인으로 돌아가기
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
