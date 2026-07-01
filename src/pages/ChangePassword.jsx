import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiLock } from 'react-icons/fi'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import PasswordInput from '@/components/signup/PasswordInput'
import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import { changePasswordLoggedIn } from '@/services/auth/passwordReset'
import {
  RESET_PASSWORD_HINT,
  RESET_PASSWORD_PLACEHOLDER,
} from '@/services/auth/passwordValidation'
import './Signup.css'

function ProfileFieldCard({ icon: Icon, label, error, hint, children }) {
  return (
    <div className={`signup-field-card${error ? ' signup-field-card--error' : ''}`}>
      <div className="signup-field-card__header">
        <Icon className="signup-field-card__icon" aria-hidden="true" />
        <span className="signup-field-card__label">{label}</span>
      </div>
      <div className="signup-field-card__body">{children}</div>
      {hint && !error && <p className="signup-field-card__hint">{hint}</p>}
      {error && (
        <p className="signup-field-card__message signup-field-card__message--error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function ChangePassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formFeedback, setFormFeedback] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      const result = await fetchCurrentUserProfile()

      if (!isMounted) {
        return
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        setIsLoading(false)
        return
      }

      setEmail(result.profile.email)
      setIsLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    setFormFeedback(null)

    try {
      const result = await changePasswordLoggedIn({
        email,
        currentPassword,
        newPassword,
        newPasswordConfirm,
      })

      if (result.errors) {
        setErrors(result.errors)
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      window.alert(result.message)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
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

  if (isLoading) {
    return (
      <MemberMypageLayout>
        <div className="signup-page">
          <div className="signup-page__container">
            <section className="signup-card">
              <p>회원정보를 불러오는 중입니다.</p>
            </section>
          </div>
        </div>
      </MemberMypageLayout>
    )
  }

  return (
    <MemberMypageLayout>
      <div className="signup-page">
        <div className="signup-page__container">
          <section className="signup-card" aria-label="비밀번호 변경">
            <header className="signup-card__header">
              <h1 className="signup-card__title">비밀번호 변경</h1>
              <div className="signup-card__accent" aria-hidden="true" />
              <p className="signup-card__description">
                현재 비밀번호 확인 후 새 비밀번호로 변경할 수 있습니다.
              </p>
            </header>

            <form className="signup-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div className="signup-form__fields">
                <ProfileFieldCard icon={FiLock} label="현재 비밀번호" error={errors.currentPassword}>
                  <PasswordInput
                    id="change-password-current"
                    name="currentPassword"
                    placeholder="현재 비밀번호를 입력하세요."
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value)
                      setErrors((prev) => ({ ...prev, currentPassword: undefined }))
                      setFormFeedback(null)
                    }}
                  />
                </ProfileFieldCard>

                <ProfileFieldCard
                  icon={FiLock}
                  label="새 비밀번호"
                  error={errors.password}
                  hint={RESET_PASSWORD_HINT}
                >
                  <PasswordInput
                    id="change-password-new"
                    name="newPassword"
                    placeholder={RESET_PASSWORD_PLACEHOLDER}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      setErrors((prev) => ({ ...prev, password: undefined }))
                      setFormFeedback(null)
                    }}
                  />
                </ProfileFieldCard>

                <ProfileFieldCard
                  icon={FiLock}
                  label="새 비밀번호 확인"
                  error={errors.passwordConfirm}
                >
                  <PasswordInput
                    id="change-password-confirm"
                    name="newPasswordConfirm"
                    placeholder="비밀번호를 다시 입력해주세요"
                    value={newPasswordConfirm}
                    onChange={(event) => {
                      setNewPasswordConfirm(event.target.value)
                      setErrors((prev) => ({ ...prev, passwordConfirm: undefined }))
                      setFormFeedback(null)
                    }}
                  />
                </ProfileFieldCard>
              </div>

              {formFeedback && (
                <p
                  className={`signup-form__feedback signup-form__feedback--${formFeedback.type}`}
                  role={formFeedback.type === 'error' ? 'alert' : 'status'}
                >
                  {formFeedback.message}
                </p>
              )}

              <div className="signup-form__actions">
                <div className="signup-form__actions-row">
                  <button type="submit" className="signup-btn signup-btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>

                <p className="signup-form__login">
                  <Link to="/member/edit" className="signup-form__login-link">
                    내 정보로 돌아가기
                  </Link>
                </p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </MemberMypageLayout>
  )
}

export default ChangePassword
