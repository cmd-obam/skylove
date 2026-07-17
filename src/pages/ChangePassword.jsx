import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiLock, FiHelpCircle } from 'react-icons/fi'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import PasswordInput from '@/components/signup/PasswordInput'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import { changePasswordLoggedIn } from '@/services/auth/passwordReset'
import {
  fetchPasswordRecoveryQuestion,
  verifyPasswordRecoveryAnswer,
} from '@/services/auth/securityRecovery'
import {
  RESET_PASSWORD_HINT,
  RESET_PASSWORD_PLACEHOLDER,
} from '@/services/auth/passwordValidation'
import {
  clearSecurityAnswerFailures,
  getSecurityAnswerLockStatus,
  recordSecurityAnswerFailure,
} from '@/utils/securityAnswerRateLimit'
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
  const [profile, setProfile] = useState(null)
  const [questionLabel, setQuestionLabel] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [securityVerified, setSecurityVerified] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formFeedback, setFormFeedback] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false)
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

      const nextProfile = result.profile
      setProfile(nextProfile)
      applyLockStatus(nextProfile.email || nextProfile.username)

      const questionResult = await fetchPasswordRecoveryQuestion({
        name: nextProfile.name,
        email: nextProfile.email,
      })

      if (!isMounted) {
        return
      }

      if (!questionResult.success) {
        setFormFeedback({
          type: 'error',
          message: questionResult.message || AUTH_MESSAGES.securityQuestionMissing,
        })
        setIsLoading(false)
        return
      }

      setQuestionLabel(questionResult.questionLabel)
      setIsLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (!profile || !isLocked) {
      return undefined
    }

    const timer = window.setInterval(() => {
      const status = applyLockStatus(profile.email || profile.username)
      if (!status.locked) {
        setFormFeedback(null)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [profile, isLocked])

  const handleVerifyAnswer = async (event) => {
    event.preventDefault()

    if (!profile || !questionLabel || securityVerified) {
      return
    }

    const identityKey = profile.email || profile.username
    const lockStatus = applyLockStatus(identityKey)

    if (lockStatus.locked) {
      setFormFeedback({
        type: 'error',
        message: lockStatus.message || AUTH_MESSAGES.securityAnswerLocked,
      })
      return
    }

    if (!securityAnswer.trim()) {
      setErrors({ securityAnswer: '답변을 입력해주세요.' })
      return
    }

    setIsVerifyingAnswer(true)
    setErrors({})
    setFormFeedback(null)

    try {
      const result = await verifyPasswordRecoveryAnswer({
        name: profile.name,
        email: profile.email,
        answer: securityAnswer,
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
      setSecurityVerified(true)
      setSecurityAnswer('')
      setFormFeedback({
        type: 'success',
        message: '보안 답변 확인이 완료되었습니다. 새 비밀번호를 입력해주세요.',
      })
    } catch {
      setFormFeedback({
        type: 'error',
        message: '답변 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsVerifyingAnswer(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!securityVerified) {
      setFormFeedback({
        type: 'error',
        message: '보안 질문 답변을 먼저 확인해 주세요.',
      })
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setFormFeedback(null)

    try {
      const result = await changePasswordLoggedIn({
        email: profile.email,
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
                회원가입 시 등록한 보안 질문 답변을 확인한 뒤 새 비밀번호로 변경할 수 있습니다.
              </p>
            </header>

            <form
              className="signup-form"
              onSubmit={securityVerified ? handleSubmit : handleVerifyAnswer}
              noValidate
              autoComplete="off"
            >
              <div className="signup-form__fields">
                <ProfileFieldCard icon={FiHelpCircle} label="비밀번호 분실 시 질문">
                  <p className="signup-field-card__hint" style={{ margin: 0 }}>
                    {questionLabel || AUTH_MESSAGES.securityQuestionMissing}
                  </p>
                </ProfileFieldCard>

                {!securityVerified && (
                  <ProfileFieldCard
                    icon={FiLock}
                    label="보안 답변"
                    error={errors.securityAnswer}
                  >
                    <input
                      id="change-password-security-answer"
                      name="securityAnswer"
                      type="text"
                      className="signup-field-card__input signup-field-card__input--full"
                      placeholder="회원가입 시 입력한 답변을 입력하세요."
                      value={securityAnswer}
                      onChange={(event) => {
                        setSecurityAnswer(event.target.value)
                        setErrors((prev) => ({ ...prev, securityAnswer: undefined }))
                        setFormFeedback(null)
                      }}
                      disabled={!questionLabel || isLocked || isVerifyingAnswer}
                      autoComplete="off"
                    />
                  </ProfileFieldCard>
                )}

                {securityVerified && (
                  <>
                    <ProfileFieldCard
                      icon={FiLock}
                      label="현재 비밀번호"
                      error={errors.currentPassword}
                    >
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
                  </>
                )}
              </div>

              {(formFeedback || (isLocked && lockMessage && !securityVerified)) && (
                <p
                  className={`signup-form__feedback signup-form__feedback--${
                    isLocked && !securityVerified ? 'error' : formFeedback?.type || 'error'
                  }`}
                  role={
                    isLocked || formFeedback?.type === 'error' ? 'alert' : 'status'
                  }
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {isLocked && !securityVerified ? lockMessage : formFeedback?.message}
                </p>
              )}

              <div className="signup-form__actions">
                <div className="signup-form__actions-row">
                  <button
                    type="submit"
                    className="signup-btn signup-btn--primary"
                    disabled={
                      securityVerified
                        ? isSubmitting
                        : isVerifyingAnswer || !questionLabel || isLocked
                    }
                  >
                    {securityVerified
                      ? isSubmitting
                        ? '변경 중...'
                        : '비밀번호 변경'
                      : isVerifyingAnswer
                        ? '확인 중...'
                        : '답변 확인'}
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
