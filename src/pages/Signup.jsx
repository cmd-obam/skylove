import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import MemberMenuSidebar from '@/components/auth/MemberMenuSidebar'
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
import SignupToast from '@/components/signup/SignupToast'
import SignupProgress from '@/components/signup/SignupProgress'
import SignupEmailPending from '@/components/signup/SignupEmailPending'
import SignupStepTerms from '@/components/signup/SignupStepTerms'
import SignupStepForm from '@/components/signup/SignupStepForm'
import SignupStepComplete from '@/components/signup/SignupStepComplete'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import './Signup.css'

const RESEND_COOLDOWN_SECONDS = 60
const SIGNUP_STEP_TERMS = 1
const SIGNUP_STEP_FORM = 2
const SIGNUP_STEP_EMAIL_PENDING = 3
const SIGNUP_STEP_COMPLETE = 4

const INITIAL_STEP1_AGREEMENTS = {
  terms: 'disagree',
  privacy: 'disagree',
  consignment: 'disagree',
}

function isStep1Agreed(value) {
  return value === 'agree'
}

function getInitialStep(form) {
  if (form.agreePrivacy && form.agreeTerms) {
    return 2
  }

  return 1
}

function getInitialStep1Agreements(form) {
  const completed = form.agreePrivacy && form.agreeTerms

  return {
    terms: completed ? 'agree' : 'disagree',
    privacy: completed ? 'agree' : 'disagree',
    consignment: completed ? 'agree' : 'disagree',
  }
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const initialState = useRef(createInitialState()).current

  const [currentStep, setCurrentStep] = useState(() => {
    if (searchParams.get('step') === 'complete') {
      return SIGNUP_STEP_COMPLETE
    }

    if (initialState.emailSent) {
      return SIGNUP_STEP_EMAIL_PENDING
    }

    return getInitialStep(initialState.form)
  })
  const [step1Agreements, setStep1Agreements] = useState(() =>
    getInitialStep1Agreements(initialState.form),
  )
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
  const [isAutoCheckingEmail, setIsAutoCheckingEmail] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)
  const [toast, setToast] = useState(null)

  const showFeedback = useCallback((type, message) => {
    if (!type || !message) {
      setFormFeedback(null)
      setToast(null)
      return
    }

    setFormFeedback({ type, message })
    setToast({ type, message })
  }, [])

  const clearFeedback = useCallback(() => {
    showFeedback(null, null)
  }, [showFeedback])

  const allStep1RequiredChecked =
    isStep1Agreed(step1Agreements.terms) &&
    isStep1Agreed(step1Agreements.privacy) &&
    isStep1Agreed(step1Agreements.consignment)
  const allStep1Checked = allStep1RequiredChecked

  const handleSidebarTabChange = (tab) => {
    if (tab === 'login') {
      navigate('/login')
      return
    }

    if (tab === 'find-id' || tab === 'find-password') {
      navigate(`/login?tab=${tab}`)
    }
  }

  const handleStep1AgreementChange = (key, value) => {
    setStep1Agreements((prev) => ({ ...prev, [key]: value }))
  }

  const handleStep1AllAgreementChange = (checked) => {
    const nextValue = checked ? 'agree' : 'disagree'
    setStep1Agreements({
      terms: nextValue,
      privacy: nextValue,
      consignment: nextValue,
    })
  }

  const handleGoToStep2 = () => {
    if (!allStep1RequiredChecked) {
      return
    }

    setForm((prev) => ({
      ...prev,
      agreePrivacy: true,
      agreeTerms: true,
    }))
    setCurrentStep(SIGNUP_STEP_FORM)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
    setToast(null)
    setIsAutoCheckingEmail(false)
    setPasswordConfirmTouched(false)
    setCurrentStep(SIGNUP_STEP_TERMS)
    setStep1Agreements(INITIAL_STEP1_AGREEMENTS)
    clearSignupDraft()
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const handleConfirmLeave = useCallback(() => {
    resetSignupForm()
  }, [resetSignupForm])

  const { isLeaveModalOpen, cancelLeave, confirmLeave, allowNavigation } = useSignupLeaveGuard({
    isDirty:
      currentStep === SIGNUP_STEP_FORM || currentStep === SIGNUP_STEP_EMAIL_PENDING ? isDirty : false,
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
      const emailValue = typeof email === 'string' ? email : form.email
      const trimmedEmail = emailValue.trim()

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

  const finalizeSignup = useCallback(async () => {
    setIsSubmitting(true)
    clearFeedback()

    let signupResult = null

    try {
      signupResult = await handleSignup(form)
    } catch (error) {
      console.error('[Signup] handleSignup 예외', error)
      showFeedback('error', '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsSubmitting(false)
      return false
    }

    if (!signupResult?.success) {
      if (signupResult?.message === SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE) {
        setIsEmailVerified(false)
      }

      showFeedback('error', signupResult?.message ?? '회원가입에 실패했습니다.')
      setIsSubmitting(false)
      return false
    }

    try {
      allowNavigation()
      resetSignupForm()
      setStep1Agreements(INITIAL_STEP1_AGREEMENTS)
      setCurrentStep(SIGNUP_STEP_COMPLETE)
    } catch (postProcessError) {
      console.warn('[Signup] 회원가입 후처리(UI) 실패 — 회원가입은 성공', postProcessError)
      setCurrentStep(SIGNUP_STEP_COMPLETE)
    }

    setIsSubmitting(false)
    return true
  }, [allowNavigation, clearFeedback, form, resetSignupForm, showFeedback])

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
    if (searchParams.get('step') !== 'complete') {
      return
    }

    setCurrentStep(SIGNUP_STEP_COMPLETE)
  }, [searchParams])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncEmailVerifiedFromSupabase()
      }
    }

    const handleWindowFocus = () => {
      syncEmailVerifiedFromSupabase()
    }

    window.addEventListener('focus', handleWindowFocus)
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
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
    }
  }, [form.email, syncEmailVerifiedFromSupabase])

  useEffect(() => {
    if (currentStep !== SIGNUP_STEP_EMAIL_PENDING || !emailSent || isEmailVerified) {
      return undefined
    }

    const timer = window.setInterval(async () => {
      setIsAutoCheckingEmail(true)

      try {
        await syncEmailVerifiedFromSupabase()
      } finally {
        setIsAutoCheckingEmail(false)
      }
    }, 5000)

    return () => {
      window.clearInterval(timer)
      setIsAutoCheckingEmail(false)
    }
  }, [currentStep, emailSent, isEmailVerified, syncEmailVerifiedFromSupabase])

  useEffect(() => {
    if (currentStep !== SIGNUP_STEP_EMAIL_PENDING || !isEmailVerified || isSubmitting) {
      return
    }

    finalizeSignup()
  }, [currentStep, finalizeSignup, isEmailVerified, isSubmitting])

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
    clearFeedback()

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
        loginId: result.available ? undefined : '아이디가 이미 존재합니다.',
      }))

      if (!result.available) {
        showFeedback('error', '아이디가 이미 존재합니다.')
      }
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
      showFeedback('error', message)
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
        setCurrentStep(SIGNUP_STEP_EMAIL_PENDING)
        return
      }

      setEmailStatusMessage('')
      setErrors((prev) => ({
        ...prev,
        email: result.message,
      }))
      showFeedback('error', result.message)
    } catch (error) {
      console.error('[Signup] sendEmailVerification 예외', error)
      const message = '인증 메일 발송에 실패했습니다.'
      setErrors((prev) => ({
        ...prev,
        email: message,
      }))
      showFeedback('error', message)
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
        setCurrentStep(SIGNUP_STEP_EMAIL_PENDING)
        return
      }

      const message = '아직 이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.'
      setErrors((prev) => ({
        ...prev,
        email: message,
      }))
      showFeedback('error', message)
    } catch (error) {
      console.error('[Signup] checkEmailVerificationStatus 예외', error)
      const message = '이메일 인증 확인에 실패했습니다. 다시 시도해주세요.'
      setErrors((prev) => ({
        ...prev,
        email: message,
      }))
      showFeedback('error', message)
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
      showFeedback('error', result.message)
    } catch (error) {
      console.error('[Signup] handleResendEmail 예외', error)
      const message = '인증 메일 발송에 실패했습니다.'
      setErrors((prev) => ({
        ...prev,
        email: message,
      }))
      showFeedback('error', message)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    clearFeedback()

    const verified = await syncEmailVerifiedFromSupabase()

    if (!verified) {
      showFeedback('error', SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE)
      return
    }

    const validation = validateForm(form, { isIdChecked, isEmailVerified: verified })
    setErrors(validation.errors)

    if (!validation.valid) {
      const message =
        validation.errors.loginId ||
        validation.errors.password ||
        validation.errors.passwordConfirm ||
        validation.errors.name ||
        validation.errors.email ||
        '입력 정보를 확인해주세요.'
      showFeedback('error', message)
      return
    }

    await finalizeSignup()
  }

  return (
    <div className="category-layout signup-page">
      <SignupToast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <SignupLeaveConfirmModal
        isOpen={isLeaveModalOpen}
        onCancel={cancelLeave}
        onConfirm={confirmLeave}
      />
      <div className="category-layout__inner">
        <MemberMenuSidebar activeTab="signup" onTabChange={handleSidebarTabChange} />

        <div className="category-layout__main signup-page__main">
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">회원가입</h1>
            </div>
            <AuthBreadcrumb label="회원가입" />
          </div>

          <SignupProgress currentStep={currentStep} />

          {currentStep === SIGNUP_STEP_TERMS && (
            <SignupStepTerms
              agreements={step1Agreements}
              onChangeAgreement={handleStep1AgreementChange}
              onChangeAll={handleStep1AllAgreementChange}
              allChecked={allStep1Checked}
              allRequiredChecked={allStep1RequiredChecked}
              onNext={handleGoToStep2}
            />
          )}

          {currentStep === SIGNUP_STEP_FORM && (
            <SignupStepForm
              form={form}
              errors={errors}
              displayedPasswordError={displayedPasswordError}
              displayedPasswordConfirmError={displayedPasswordConfirmError}
              idCheckMessage={idCheckMessage}
              emailFieldSuccess={emailFieldSuccess}
              isIdChecked={isIdChecked}
              isCheckingId={isCheckingId}
              isSendingEmail={isSendingEmail}
              isCheckingEmail={isCheckingEmail}
              isEmailVerified={isEmailVerified}
              emailSent={emailSent}
              resendCooldown={resendCooldown}
              isSubmitting={isSubmitting}
              isSyncingEmailVerification={isSyncingEmailVerification}
              formFeedback={formFeedback}
              onSubmit={onSubmit}
              onCancel={() => navigate('/login')}
              updateField={updateField}
              setPasswordConfirmTouched={setPasswordConfirmTouched}
              handleDuplicateCheck={handleDuplicateCheck}
              handleEmailVerify={handleEmailVerify}
              handleCheckEmailVerification={handleCheckEmailVerification}
              handleResendEmail={handleResendEmail}
              formatPhoneNumber={formatPhoneNumber}
            />
          )}

          {currentStep === SIGNUP_STEP_EMAIL_PENDING && (
            <div className="signup-card signup-card--embedded">
              <SignupEmailPending
                email={form.email.trim()}
                resendCooldown={resendCooldown}
                isSendingEmail={isSendingEmail}
                isCheckingEmail={isCheckingEmail}
                isAutoChecking={isAutoCheckingEmail}
                formFeedback={formFeedback}
                onCheck={handleCheckEmailVerification}
                onResend={handleResendEmail}
                onEdit={() => setCurrentStep(SIGNUP_STEP_FORM)}
              />
            </div>
          )}

          {currentStep === SIGNUP_STEP_COMPLETE && (
            <div className="signup-card signup-card--embedded">
              <SignupStepComplete />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Signup
