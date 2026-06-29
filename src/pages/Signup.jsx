import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiLock, FiCalendar, FiMail, FiSmartphone } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useSignupLeaveGuard } from '@/hooks/useSignupLeaveGuard'
import {
  INITIAL_SIGNUP_FORM,
  checkDuplicateId,
  checkEmailVerificationStatus,
  formatPhoneNumber,
  getPasswordRuleLiveError,
  handleSignup,
  sendEmailVerification,
  validateForm,
} from '@/services/auth/signup'
import {
  SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
  SIGNUP_EMAIL_SENT_MESSAGE,
  SIGNUP_EMAIL_VERIFIED_MESSAGE,
  SIGNUP_RESEND_SUCCESS_MESSAGE,
} from '@/services/auth/signupErrors'
import {
  clearSignupDraft,
  consumeSignupDraftDiscarded,
  getResendCooldownRemaining,
  isSignupFormDirty,
  loadSignupDraft,
  saveSignupDraft,
} from '@/utils/signupDraft'
import BirthDateSelect from '@/components/signup/BirthDateSelect'
import PasswordInput from '@/components/signup/PasswordInput'
import './Signup.css'

const SIGNUP_PASSWORD_PLACEHOLDER = '8자 이상, 특수문자 포함'
const SIGNUP_PASSWORD_CONFIRM_PLACEHOLDER = '비밀번호를 다시 입력해주세요'
const RESEND_COOLDOWN_SECONDS = 60

function SignupLeaveConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="signup-leave-modal" role="presentation">
      <div
        className="signup-leave-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-leave-modal-title"
      >
        <h2 id="signup-leave-modal-title" className="signup-leave-modal__title">
          작성 중인 회원가입 정보가 있습니다.
        </h2>
        <p className="signup-leave-modal__content">
          현재 페이지를 벗어나면
          {'\n'}
          입력한 회원가입 정보와 이메일 인증 상태가 모두 삭제됩니다.
          {'\n\n'}
          계속 이동하시겠습니까?
        </p>
        <div className="signup-leave-modal__actions">
          <button type="button" className="signup-btn signup-btn--secondary" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="signup-btn signup-btn--primary" onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupFieldCard({ icon: Icon, label, optional = false, error, success, hint, hintId, children }) {
  return (
    <div className={`signup-field-card${error ? ' signup-field-card--error' : ''}`}>
      <div className="signup-field-card__header">
        <Icon className="signup-field-card__icon" aria-hidden="true" />
        <span className="signup-field-card__label">{label}</span>
        {optional && <span className="signup-field-card__optional">(선택)</span>}
      </div>
      <div className="signup-field-card__body">{children}</div>
      {hint && !error && (
        <p id={hintId} className="signup-field-card__hint">
          {hint}
        </p>
      )}
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

function createInitialState() {
  if (consumeSignupDraftDiscarded()) {
    return {
      form: INITIAL_SIGNUP_FORM,
      isIdChecked: false,
      idCheckMessage: '',
      emailSent: false,
      emailStatusMessage: '',
      resendAvailableAt: null,
    }
  }

  const draft = loadSignupDraft()

  return {
    form: draft?.form ? { ...INITIAL_SIGNUP_FORM, ...draft.form } : INITIAL_SIGNUP_FORM,
    isIdChecked: draft?.isIdChecked ?? false,
    idCheckMessage: draft?.idCheckMessage ?? '',
    emailSent: draft?.emailSent ?? false,
    emailStatusMessage: draft?.emailStatusMessage ?? '',
    resendAvailableAt: draft?.resendAvailableAt ?? null,
  }
}

function Signup() {
  const navigate = useNavigate()
  const initialState = useRef(createInitialState()).current

  const [form, setForm] = useState(initialState.form)
  const [errors, setErrors] = useState({})
  const [isIdChecked, setIsIdChecked] = useState(initialState.isIdChecked)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [idCheckMessage, setIdCheckMessage] = useState(initialState.idCheckMessage)
  const [emailSent, setEmailSent] = useState(initialState.emailSent)
  const [emailStatusMessage, setEmailStatusMessage] = useState(initialState.emailStatusMessage)
  const [resendAvailableAt, setResendAvailableAt] = useState(initialState.resendAvailableAt)
  const [resendCooldown, setResendCooldown] = useState(() =>
    getResendCooldownRemaining(initialState.resendAvailableAt),
  )
  const [formFeedback, setFormFeedback] = useState(null)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingEmailVerification, setIsSyncingEmailVerification] = useState(true)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)

  const passwordRuleLiveError = getPasswordRuleLiveError(form.password)
  const passwordConfirmLiveError =
    passwordConfirmTouched &&
    form.passwordConfirm &&
    !passwordRuleLiveError &&
    form.password !== form.passwordConfirm
      ? '비밀번호가 일치하지 않습니다.'
      : undefined

  const displayedPasswordError = errors.password || passwordRuleLiveError
  const displayedPasswordConfirmError = errors.passwordConfirm || passwordConfirmLiveError
  const emailFieldSuccess = isEmailVerified
    ? SIGNUP_EMAIL_VERIFIED_MESSAGE
    : !errors.email && emailStatusMessage
      ? emailStatusMessage
      : undefined

  const isDirty = useMemo(
    () =>
      isSignupFormDirty({
        form,
        isIdChecked,
        idCheckMessage,
        isEmailVerified,
        emailSent,
        emailStatusMessage,
        resendAvailableAt,
      }),
    [
      form,
      isIdChecked,
      idCheckMessage,
      isEmailVerified,
      emailSent,
      emailStatusMessage,
      resendAvailableAt,
    ],
  )

  const resetSignupForm = useCallback(() => {
    setForm(INITIAL_SIGNUP_FORM)
    setErrors({})
    setIsIdChecked(false)
    setIsEmailVerified(false)
    setIdCheckMessage('')
    setEmailSent(false)
    setEmailStatusMessage('')
    setResendAvailableAt(null)
    setResendCooldown(0)
    setFormFeedback(null)
    setPasswordConfirmTouched(false)
    clearSignupDraft()
  }, [])

  const handleConfirmLeave = useCallback(() => {
    resetSignupForm()
  }, [resetSignupForm])

  const { isLeaveModalOpen, cancelLeave, confirmLeave, allowNavigation } = useSignupLeaveGuard({
    isDirty,
    onConfirmLeave: handleConfirmLeave,
  })

  const persistDraft = useCallback(
    (overrides = {}) => {
      saveSignupDraft({
        form,
        isIdChecked,
        isEmailVerified,
        idCheckMessage,
        emailSent,
        emailStatusMessage,
        resendAvailableAt,
        ...overrides,
      })
    },
    [form, isIdChecked, isEmailVerified, idCheckMessage, emailSent, emailStatusMessage, resendAvailableAt],
  )

  const syncEmailVerifiedFromSupabase = useCallback(
    async (email = form.email) => {
      const trimmedEmail = email.trim()

      if (!trimmedEmail) {
        setIsEmailVerified(false)
        return false
      }

      const result = await checkEmailVerificationStatus(trimmedEmail)

      if (result.verified) {
        setIsEmailVerified(true)
        setEmailSent(true)
        setErrors((prev) => ({ ...prev, email: undefined }))
        return true
      }

      setIsEmailVerified(false)
      return false
    },
    [form.email],
  )

  useEffect(() => {
    if (!isDirty) {
      clearSignupDraft()
      return
    }

    persistDraft()
  }, [isDirty, persistDraft])

  useEffect(() => {
    let isMounted = true

    async function bootstrapEmailVerification() {
      setIsSyncingEmailVerification(true)

      const email = initialState.form.email.trim()

      if (email) {
        const result = await checkEmailVerificationStatus(email)

        if (isMounted && result.verified) {
          setIsEmailVerified(true)
          setEmailSent(true)
        }
      }

      if (isMounted) {
        setIsSyncingEmailVerification(false)
      }
    }

    bootstrapEmailVerification()

    return () => {
      isMounted = false
    }
  }, [initialState.form.email])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncEmailVerifiedFromSupabase()
      }
    }

    window.addEventListener('focus', syncEmailVerifiedFromSupabase)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
        session?.user?.email?.toLowerCase() === form.email.trim().toLowerCase()
      ) {
        syncEmailVerifiedFromSupabase(session.user.email)
      }
    })

    return () => {
      window.removeEventListener('focus', syncEmailVerifiedFromSupabase)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
    }
  }, [form.email, syncEmailVerifiedFromSupabase])

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setResendCooldown(getResendCooldownRemaining(resendAvailableAt))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendAvailableAt, resendCooldown])

  const startResendCooldown = () => {
    const nextAvailableAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    setResendAvailableAt(nextAvailableAt)
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    persistDraft({ resendAvailableAt: nextAvailableAt })
  }

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
      setEmailStatusMessage('')
      setEmailSent(false)
      setResendAvailableAt(null)
      setResendCooldown(0)
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
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes('001_create_profiles.sql')
          ? error.message
          : error instanceof Error && error.message.includes('sql_editor_functions_only.sql')
            ? error.message
            : '아이디 중복확인에 실패했습니다. 다시 시도해주세요.'
      setErrors((prev) => ({
        ...prev,
        loginId: message,
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

    try {
      const alreadyVerified = await syncEmailVerifiedFromSupabase(email)

      if (alreadyVerified) {
        setEmailStatusMessage('')
        return
      }

      const result = await sendEmailVerification(email)

      if (result.success && result.alreadyVerified) {
        await syncEmailVerifiedFromSupabase(email)
        setEmailStatusMessage('')
        return
      }

      if (result.success) {
        setEmailSent(true)
        setEmailStatusMessage(result.message || SIGNUP_EMAIL_SENT_MESSAGE)
        setErrors((prev) => ({ ...prev, email: undefined }))
        startResendCooldown()
        return
      }

      setEmailStatusMessage('')
      setErrors((prev) => ({
        ...prev,
        email: result.message,
      }))
    } catch (error) {
      console.error('[Signup] sendEmailVerification 예외', error)
      setErrors((prev) => ({
        ...prev,
        email: '인증 메일 발송에 실패했습니다.',
      }))
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleCheckEmailVerification = async () => {
    const email = form.email.trim()

    if (!email) {
      setErrors((prev) => ({ ...prev, email: '이메일을 입력해주세요.' }))
      return
    }

    setIsCheckingEmail(true)

    try {
      const verified = await syncEmailVerifiedFromSupabase(email)

      if (verified) {
        setEmailStatusMessage('')
        return
      }

      setErrors((prev) => ({
        ...prev,
        email: '아직 이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
      }))
    } catch (error) {
      console.error('[Signup] checkEmailVerificationStatus 예외', error)
      setErrors((prev) => ({
        ...prev,
        email: '이메일 인증 확인에 실패했습니다. 다시 시도해주세요.',
      }))
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isSendingEmail) {
      return
    }

    setIsSendingEmail(true)
    setErrors((prev) => ({ ...prev, email: undefined }))

    try {
      const alreadyVerified = await syncEmailVerifiedFromSupabase()

      if (alreadyVerified) {
        setEmailStatusMessage('')
        return
      }

      const result = await sendEmailVerification(form.email)

      if (result.success && result.alreadyVerified) {
        await syncEmailVerifiedFromSupabase()
        setEmailStatusMessage('')
        return
      }

      if (result.success) {
        setEmailSent(true)
        setEmailStatusMessage(SIGNUP_RESEND_SUCCESS_MESSAGE)
        startResendCooldown()
        return
      }

      setErrors((prev) => ({
        ...prev,
        email: result.message,
      }))
    } catch (error) {
      console.error('[Signup] handleResendEmail 예외', error)
      setErrors((prev) => ({
        ...prev,
        email: '인증 메일 발송에 실패했습니다.',
      }))
    } finally {
      setIsSendingEmail(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setFormFeedback(null)

    const verified = await syncEmailVerifiedFromSupabase()

    if (!verified) {
      setFormFeedback({
        type: 'error',
        message: SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
      })
      return
    }

    const validation = validateForm(form, { isIdChecked, isEmailVerified: verified })
    setErrors(validation.errors)

    if (!validation.valid) {
      setFormFeedback({
        type: 'error',
        message: validation.errors.email || '입력 정보를 확인해주세요.',
      })
      return
    }

    setIsSubmitting(true)

    let signupResult = null

    try {
      signupResult = await handleSignup(form)
    } catch (error) {
      console.error('[Signup] handleSignup 예외', error)
      setFormFeedback({
        type: 'error',
        message: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
      setIsSubmitting(false)
      return
    }

    if (!signupResult?.success) {
      if (signupResult?.message === SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE) {
        setIsEmailVerified(false)
      }

      setFormFeedback({
        type: 'error',
        message: signupResult?.message ?? '회원가입에 실패했습니다.',
      })
      setIsSubmitting(false)
      return
    }

    try {
      allowNavigation()
      resetSignupForm()
    } catch (postProcessError) {
      console.warn('[Signup] 회원가입 후처리(UI) 실패 — 회원가입은 성공', postProcessError)
    }

    navigate('/')
    setIsSubmitting(false)
  }

  return (
    <div className="signup-page">
      <SignupLeaveConfirmModal
        isOpen={isLeaveModalOpen}
        onCancel={cancelLeave}
        onConfirm={confirmLeave}
      />
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

          <form className="signup-form" onSubmit={onSubmit} noValidate autoComplete="off">
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
                    autoComplete="off"
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

              <SignupFieldCard icon={FiLock} label="비밀번호" error={displayedPasswordError}>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  placeholder={SIGNUP_PASSWORD_PLACEHOLDER}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  autoComplete="off"
                />
              </SignupFieldCard>

              <SignupFieldCard
                icon={FiLock}
                label="비밀번호 확인"
                error={displayedPasswordConfirmError}
              >
                <PasswordInput
                  id="signup-password-confirm"
                  name="passwordConfirm"
                  placeholder={SIGNUP_PASSWORD_CONFIRM_PLACEHOLDER}
                  value={form.passwordConfirm}
                  onChange={(event) => {
                    setPasswordConfirmTouched(true)
                    updateField('passwordConfirm', event.target.value)
                  }}
                  autoComplete="off"
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
                  autoComplete="off"
                />
              </SignupFieldCard>

              <SignupFieldCard icon={FiCalendar} label="생년월일" error={errors.birthDate}>
                <BirthDateSelect
                  idPrefix="signup-birth"
                  value={form.birthDate}
                  onChange={(nextValue) => updateField('birthDate', nextValue)}
                />
              </SignupFieldCard>

              <SignupFieldCard
                icon={FiMail}
                label="이메일"
                error={errors.email}
                success={emailFieldSuccess}
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
                    readOnly={isEmailVerified}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className={`signup-btn signup-btn--secondary${
                      isEmailVerified ? ' signup-btn--secondary-verified' : ''
                    }`}
                    onClick={handleEmailVerify}
                    disabled={isSendingEmail || isEmailVerified}
                  >
                    {isSendingEmail
                      ? '발송 중...'
                      : isEmailVerified
                        ? '인증 완료'
                        : '이메일 인증'}
                  </button>
                </div>

                {emailSent && !isEmailVerified && (
                  <div className="signup-email-actions">
                    <button
                      type="button"
                      className="signup-btn signup-btn--secondary signup-btn--full"
                      onClick={handleCheckEmailVerification}
                      disabled={isCheckingEmail || isSendingEmail}
                    >
                      {isCheckingEmail ? '확인 중...' : '인증 확인'}
                    </button>
                    <button
                      type="button"
                      className="signup-btn signup-btn--secondary signup-btn--full"
                      onClick={handleResendEmail}
                      disabled={isSendingEmail || resendCooldown > 0}
                    >
                      {isSendingEmail
                        ? '발송 중...'
                        : resendCooldown > 0
                          ? `재발송 (${resendCooldown})`
                          : '인증 메일 재발송'}
                    </button>
                  </div>
                )}
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
                  autoComplete="off"
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
              <button
                type="submit"
                className="signup-btn signup-btn--primary"
                disabled={isSubmitting || isSyncingEmailVerification || !isEmailVerified}
              >
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
