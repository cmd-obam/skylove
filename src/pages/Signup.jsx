import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiUser, FiLock, FiCalendar, FiMail, FiSmartphone } from 'react-icons/fi'
import {
  INITIAL_SIGNUP_FORM,
  checkDuplicateId,
  formatPhoneNumber,
  handleSignup,
  sendEmailVerification,
  validateForm,
} from '@/services/auth/signup'
import './Signup.css'

function SignupFieldCard({ icon: Icon, label, optional = false, error, success, children }) {
  return (
    <div className={`signup-field-card${error ? ' signup-field-card--error' : ''}`}>
      <div className="signup-field-card__header">
        <Icon className="signup-field-card__icon" aria-hidden="true" />
        <span className="signup-field-card__label">{label}</span>
        {optional && <span className="signup-field-card__optional">(선택)</span>}
      </div>
      <div className="signup-field-card__body">{children}</div>
      {error && (
        <p className="signup-field-card__message signup-field-card__message--error" role="alert">
          {error}
        </p>
      )}
      {!error && success && (
        <p className="signup-field-card__message signup-field-card__message--success">{success}</p>
      )}
    </div>
  )
}

function SignupAgreement({ id, checked, onChange, label, badge }) {
  return (
    <label className="signup-agreement" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="signup-agreement__input"
        checked={checked}
        onChange={onChange}
      />
      <span className="signup-agreement__check" aria-hidden="true" />
      <span className="signup-agreement__text">
        {label}
        <span className="signup-agreement__badge">{badge}</span>
      </span>
    </label>
  )
}

function Signup() {
  const [form, setForm] = useState(INITIAL_SIGNUP_FORM)
  const [errors, setErrors] = useState({})
  const [isIdChecked, setIsIdChecked] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [idCheckMessage, setIdCheckMessage] = useState('')
  const [emailVerifyMessage, setEmailVerifyMessage] = useState('')
  const [formFeedback, setFormFeedback] = useState(null)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setFormFeedback(null)

    if (name === 'loginId') {
      setIsIdChecked(false)
      setIdCheckMessage('')
    }

    if (name === 'email') {
      setIsEmailVerified(false)
      setEmailVerifyMessage('')
    }
  }

  const handleDuplicateCheck = async () => {
    const loginId = form.loginId.trim()
    const idValidation = validateForm(
      { ...form, loginId },
      { isIdChecked: true, isEmailVerified: true },
    )

    if (!loginId) {
      setErrors((prev) => ({ ...prev, loginId: '아이디를 입력해주세요.' }))
      return
    }

    if (idValidation.errors.loginId && !idValidation.errors.loginId.includes('중복확인')) {
      setErrors((prev) => ({ ...prev, loginId: idValidation.errors.loginId }))
      return
    }

    setIsCheckingId(true)
    setIdCheckMessage('')

    try {
      const result = await checkDuplicateId(loginId)
      setIsIdChecked(result.available)
      setIdCheckMessage(result.message)
      setErrors((prev) => ({
        ...prev,
        loginId: result.available ? undefined : '이미 사용 중인 아이디입니다.',
      }))
    } catch {
      setErrors((prev) => ({
        ...prev,
        loginId: '아이디 중복확인에 실패했습니다. 다시 시도해주세요.',
      }))
    } finally {
      setIsCheckingId(false)
    }
  }

  const handleEmailVerify = async () => {
    const email = form.email.trim()
    const emailValidation = validateForm(
      { ...form, email },
      { isIdChecked: true, isEmailVerified: true },
    )

    if (!email) {
      setErrors((prev) => ({ ...prev, email: '이메일을 입력해주세요.' }))
      return
    }

    if (emailValidation.errors.email && !emailValidation.errors.email.includes('인증')) {
      setErrors((prev) => ({ ...prev, email: emailValidation.errors.email }))
      return
    }

    setIsSendingEmail(true)
    setEmailVerifyMessage('')

    try {
      const result = await sendEmailVerification(email)
      setIsEmailVerified(result.success)
      setEmailVerifyMessage(result.message)
      setErrors((prev) => ({ ...prev, email: undefined }))
    } catch {
      setErrors((prev) => ({
        ...prev,
        email: '이메일 인증 요청에 실패했습니다. 다시 시도해주세요.',
      }))
    } finally {
      setIsSendingEmail(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    const validation = validateForm(form, { isIdChecked, isEmailVerified })
    setErrors(validation.errors)

    if (!validation.valid) {
      setFormFeedback({
        type: 'error',
        message: '입력 정보를 확인해주세요.',
      })
      return
    }

    setIsSubmitting(true)
    setFormFeedback(null)

    try {
      const result = await handleSignup(form)

      if (result.success) {
        setFormFeedback({
          type: 'success',
          message: result.message,
        })
      }
    } catch {
      setFormFeedback({
        type: 'error',
        message: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-page__container">
        <section className="signup-card" aria-label="회원가입">
          <header className="signup-card__header">
            <h1 className="signup-card__title">회원가입</h1>
            <div className="signup-card__accent" aria-hidden="true" />
            <p className="signup-card__description">
              하늘사랑교회 홈페이지 회원가입을 통해 다양한 교회 소식과 서비스를 이용하실 수
              있습니다.
            </p>
          </header>

          <form className="signup-form" onSubmit={onSubmit} noValidate>
            <div className="signup-form__fields">
              <SignupFieldCard
                icon={FiUser}
                label="아이디"
                error={errors.loginId}
                success={!errors.loginId ? idCheckMessage : undefined}
              >
                <div className="signup-field-card__row">
                  <input
                    id="signup-login-id"
                    name="loginId"
                    type="text"
                    className="signup-field-card__input"
                    placeholder="아이디를 입력하세요."
                    value={form.loginId}
                    onChange={(event) => updateField('loginId', event.target.value)}
                    autoComplete="username"
                  />
                  <button
                    type="button"
                    className={`signup-btn signup-btn--secondary${
                      isIdChecked ? ' signup-btn--secondary-verified' : ''
                    }`}
                    onClick={handleDuplicateCheck}
                    disabled={isCheckingId}
                  >
                    {isCheckingId ? '확인 중...' : '중복확인'}
                  </button>
                </div>
              </SignupFieldCard>

              <SignupFieldCard icon={FiLock} label="비밀번호" error={errors.password}>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="비밀번호를 입력하세요."
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  autoComplete="new-password"
                />
              </SignupFieldCard>

              <SignupFieldCard icon={FiLock} label="비밀번호 확인" error={errors.passwordConfirm}>
                <input
                  id="signup-password-confirm"
                  name="passwordConfirm"
                  type="password"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="비밀번호를 다시 입력하세요."
                  value={form.passwordConfirm}
                  onChange={(event) => updateField('passwordConfirm', event.target.value)}
                  autoComplete="new-password"
                />
              </SignupFieldCard>

              <SignupFieldCard icon={FiUser} label="이름" error={errors.name}>
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="이름을 입력하세요."
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete="name"
                />
              </SignupFieldCard>

              <SignupFieldCard icon={FiCalendar} label="생년월일" error={errors.birthDate}>
                <input
                  id="signup-birth-date"
                  name="birthDate"
                  type="date"
                  className="signup-field-card__input signup-field-card__input--full signup-field-card__input--date"
                  value={form.birthDate}
                  onChange={(event) => updateField('birthDate', event.target.value)}
                />
              </SignupFieldCard>

              <SignupFieldCard
                icon={FiMail}
                label="이메일"
                error={errors.email}
                success={!errors.email ? emailVerifyMessage : undefined}
              >
                <div className="signup-field-card__row">
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    className="signup-field-card__input"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    autoComplete="email"
                  />
                  <button
                    type="button"
                    className={`signup-btn signup-btn--secondary${
                      isEmailVerified ? ' signup-btn--secondary-verified' : ''
                    }`}
                    onClick={handleEmailVerify}
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? '발송 중...' : '이메일 인증'}
                  </button>
                </div>
              </SignupFieldCard>

              <SignupFieldCard
                icon={FiSmartphone}
                label="휴대폰 번호"
                optional
                error={errors.phone}
              >
                <input
                  id="signup-phone"
                  name="phone"
                  type="tel"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
                  autoComplete="tel"
                />
              </SignupFieldCard>
            </div>

            <div className="signup-agreements">
              <SignupAgreement
                id="signup-agree-privacy"
                checked={form.agreePrivacy}
                onChange={(event) => updateField('agreePrivacy', event.target.checked)}
                label="개인정보 처리방침 동의"
                badge="(필수)"
              />
              {errors.agreePrivacy && (
                <p className="signup-agreements__error" role="alert">
                  {errors.agreePrivacy}
                </p>
              )}

              <SignupAgreement
                id="signup-agree-terms"
                checked={form.agreeTerms}
                onChange={(event) => updateField('agreeTerms', event.target.checked)}
                label="이용약관 동의"
                badge="(필수)"
              />
              {errors.agreeTerms && (
                <p className="signup-agreements__error" role="alert">
                  {errors.agreeTerms}
                </p>
              )}

              <SignupAgreement
                id="signup-agree-email"
                checked={form.agreeEmail}
                onChange={(event) => updateField('agreeEmail', event.target.checked)}
                label="이메일 수신 동의"
                badge="(선택)"
              />
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
              <button type="submit" className="signup-btn signup-btn--primary" disabled={isSubmitting}>
                {isSubmitting ? '가입 처리 중...' : '회원가입'}
              </button>

              <p className="signup-form__login">
                이미 회원이신가요?
                <Link to="/login" className="signup-form__login-link">
                  로그인하기
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Signup
