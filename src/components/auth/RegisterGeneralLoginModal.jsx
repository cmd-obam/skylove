import { useState } from 'react'
import PasswordInput from '@/components/signup/PasswordInput'
import SignupFormRow from '@/components/signup/SignupFormRow'
import {
  isCustomSecurityQuestionSelected,
  SECURITY_QUESTIONS,
  SECURITY_QUESTION_PLACEHOLDER,
} from '@/data/securityQuestions'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  checkDuplicateId,
  registerGeneralLogin,
  validateGeneralLoginForm,
} from '@/services/auth/registerGeneralLogin'
import {
  getPasswordConfirmLiveError,
  getPasswordConfirmLiveSuccess,
  getPasswordRuleLiveError,
  getPasswordRuleLiveSuccess,
  isPasswordReadyForSignup,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIREMENT_HINT,
} from '@/services/auth/signup'
import './DeleteAccountModal.css'
import '@/pages/Signup.css'

const PASSWORD_CONFIRM_PLACEHOLDER = '비밀번호를 다시 입력해주세요'

const INITIAL_FORM = {
  loginId: '',
  password: '',
  passwordConfirm: '',
  securityQuestion: '',
  securityCustomQuestion: '',
  securityAnswer: '',
}

function RegisterGeneralLoginModal({
  isOpen,
  email = '',
  isSubmitting = false,
  onCancel,
  onRegistered,
}) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isIdChecked, setIsIdChecked] = useState(false)
  const [idCheckMessage, setIdCheckMessage] = useState('')
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)
  const [localSubmitting, setLocalSubmitting] = useState(false)

  if (!isOpen) {
    return null
  }

  const submitting = isSubmitting || localSubmitting

  const displayedPasswordError =
    errors.password || getPasswordRuleLiveError(form.password) || undefined
  const displayedPasswordSuccess =
    !errors.password ? getPasswordRuleLiveSuccess(form.password) : undefined
  const displayedPasswordConfirmError =
    errors.passwordConfirm ||
    (passwordConfirmTouched
      ? getPasswordConfirmLiveError(form.password, form.passwordConfirm)
      : undefined)
  const displayedPasswordConfirmSuccess =
    !errors.passwordConfirm && passwordConfirmTouched
      ? getPasswordConfirmLiveSuccess(form.password, form.passwordConfirm)
      : undefined

  const canSubmit =
    isIdChecked &&
    isPasswordReadyForSignup(form.password) &&
    form.password === form.passwordConfirm &&
    Boolean(form.securityQuestion) &&
    Boolean(String(form.securityAnswer || '').trim()) &&
    (!isCustomSecurityQuestionSelected(form.securityQuestion) ||
      Boolean(String(form.securityCustomQuestion || '').trim()))

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setFeedback(null)

    if (name === 'loginId') {
      setIsIdChecked(false)
      setIdCheckMessage('')
    }
  }

  const handleDuplicateCheck = async () => {
    const loginId = form.loginId.trim()

    if (!loginId) {
      setErrors((prev) => ({ ...prev, loginId: '아이디를 입력해주세요.' }))
      return
    }

    setIsCheckingId(true)
    setFeedback(null)

    try {
      const result = await checkDuplicateId(loginId)
      setIsIdChecked(Boolean(result.available))
      setIdCheckMessage(result.available ? '사용 가능한 아이디입니다.' : '')
      setErrors((prev) => ({
        ...prev,
        loginId: result.available ? undefined : '아이디가 이미 존재합니다.',
      }))
    } catch (error) {
      console.error('[RegisterGeneralLoginModal] checkDuplicateId failed', error)
      setIsIdChecked(false)
      setIdCheckMessage('')
      setErrors((prev) => ({
        ...prev,
        loginId: '아이디 중복확인에 실패했습니다. 다시 시도해주세요.',
      }))
    } finally {
      setIsCheckingId(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback(null)

    const validation = validateGeneralLoginForm(form, { isIdChecked })

    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setLocalSubmitting(true)

    const result = await registerGeneralLogin(form, { isIdChecked })

    if (!result.success) {
      setErrors(result.errors || {})
      setFeedback({
        type: 'error',
        message: result.message || '일반 로그인 등록에 실패했습니다.',
      })
      setLocalSubmitting(false)
      return
    }

    setLocalSubmitting(false)
    onRegistered?.(result)
  }

  return (
    <div className="delete-account-modal" role="presentation">
      <div
        className="delete-account-modal__dialog delete-account-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-general-login-modal-title"
      >
        <h2 id="register-general-login-modal-title" className="delete-account-modal__title">
          일반 로그인 계정 등록
        </h2>

        <form className="signup-info-form" onSubmit={handleSubmit} noValidate>
          <div className="signup-info-form__panel" style={{ marginTop: '1rem', boxShadow: 'none' }}>
            <SignupFormRow
              label="회원 아이디"
              required
              htmlFor="general-login-id"
              hint="4자리 이상, 영문·숫자·밑줄(_)만 사용할 수 있습니다."
              error={errors.loginId}
              success={!errors.loginId ? idCheckMessage : undefined}
            >
              <div className="signup-info-form__inline">
                <input
                  id="general-login-id"
                  name="loginId"
                  type="text"
                  className="signup-info-form__input"
                  placeholder="아이디를 입력하세요."
                  value={form.loginId}
                  onChange={(event) => updateField('loginId', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className={`signup-btn signup-btn--gray${
                    isIdChecked ? ' signup-btn--gray-verified' : ''
                  }`}
                  onClick={handleDuplicateCheck}
                  disabled={isCheckingId || submitting}
                >
                  {isCheckingId ? '확인 중...' : '중복확인'}
                </button>
              </div>
            </SignupFormRow>

            <SignupFormRow
              label="비밀번호"
              required
              htmlFor="general-login-password"
              hint={PASSWORD_REQUIREMENT_HINT}
              alwaysShowHint
              reserveFeedback
              error={displayedPasswordError}
              success={displayedPasswordSuccess}
              rowClassName="signup-info-form__row--password"
            >
              <PasswordInput
                id="general-login-password"
                name="password"
                placeholder={PASSWORD_PLACEHOLDER}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="signup-info-form__input"
                wrapperClassName="signup-info-form__password"
                disabled={submitting}
              />
            </SignupFormRow>

            <SignupFormRow
              label="비밀번호 확인"
              required
              htmlFor="general-login-password-confirm"
              reserveFeedback
              error={displayedPasswordConfirmError}
              success={displayedPasswordConfirmSuccess}
              rowClassName="signup-info-form__row--password-confirm"
            >
              <PasswordInput
                id="general-login-password-confirm"
                name="passwordConfirm"
                placeholder={PASSWORD_CONFIRM_PLACEHOLDER}
                value={form.passwordConfirm}
                onChange={(event) => {
                  setPasswordConfirmTouched(true)
                  updateField('passwordConfirm', event.target.value)
                }}
                className="signup-info-form__input"
                wrapperClassName="signup-info-form__password"
                disabled={submitting}
              />
            </SignupFormRow>

            <SignupFormRow
              label="비밀번호 분실 시 질문"
              required
              htmlFor="general-login-security-question"
              error={errors.securityQuestion}
            >
              <select
                id="general-login-security-question"
                name="securityQuestion"
                className="signup-info-form__input signup-info-form__select"
                value={form.securityQuestion}
                onChange={(event) => {
                  updateField('securityQuestion', event.target.value)
                  if (!isCustomSecurityQuestionSelected(event.target.value)) {
                    updateField('securityCustomQuestion', '')
                  }
                }}
                disabled={submitting}
              >
                <option value="">{SECURITY_QUESTION_PLACEHOLDER}</option>
                {SECURITY_QUESTIONS.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.label}
                  </option>
                ))}
              </select>
            </SignupFormRow>

            {isCustomSecurityQuestionSelected(form.securityQuestion) && (
              <SignupFormRow
                label="질문 입력"
                required
                htmlFor="general-login-security-custom-question"
                error={errors.securityCustomQuestion}
              >
                <input
                  id="general-login-security-custom-question"
                  name="securityCustomQuestion"
                  type="text"
                  className="signup-info-form__input"
                  placeholder="비밀번호 찾기에 사용할 질문을 입력하세요."
                  value={form.securityCustomQuestion}
                  onChange={(event) => updateField('securityCustomQuestion', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                  disabled={submitting}
                />
              </SignupFormRow>
            )}

            <SignupFormRow
              label="답변 입력"
              required
              htmlFor="general-login-security-answer"
              error={errors.securityAnswer}
            >
              <input
                id="general-login-security-answer"
                name="securityAnswer"
                type="text"
                className="signup-info-form__input"
                placeholder="비밀번호 찾기에 사용할 답변을 입력하세요."
                value={form.securityAnswer}
                onChange={(event) => updateField('securityAnswer', event.target.value)}
                autoComplete={AUTOCOMPLETE_OFF}
                disabled={submitting}
              />
            </SignupFormRow>

            <SignupFormRow
              label="이메일"
              required
              htmlFor="general-login-email"
              hint="카카오 계정 이메일이 사용됩니다. 수정할 수 없습니다."
              alwaysShowHint
            >
              <input
                id="general-login-email"
                name="email"
                type="email"
                className="signup-info-form__input"
                value={email}
                readOnly
                disabled
              />
            </SignupFormRow>
          </div>

          {feedback && (
            <p
              className={`signup-form__feedback signup-form__feedback--${feedback.type}`}
              role={feedback.type === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          )}

          <div className="delete-account-modal__actions">
            <button
              type="button"
              className="signup-btn signup-btn--secondary signup-btn--full"
              onClick={onCancel}
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="signup-btn signup-btn--primary signup-btn--full"
              disabled={submitting || !canSubmit}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterGeneralLoginModal
