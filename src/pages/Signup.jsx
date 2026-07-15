import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  validateSignupEmail,
} from '@/services/auth/signup'
import {
  SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE,
  SIGNUP_EMAIL_SENT_MESSAGE,
  SIGNUP_EMAIL_VERIFIED_MESSAGE,
  SIGNUP_RESEND_SUCCESS_MESSAGE,
} from '@/services/auth/signupErrors'
import {
  clearEmailVerifiedBeacon,
  clearSignupDraft,
  getResendCooldownRemaining,
  getSupabaseAuthStorageKeyHint,
  isSignupFormDirty,
  markSignupDraftDiscarded,
  releaseSignupLock,
  subscribeEmailVerified,
  tryAcquireSignupLock,
} from '@/utils/signupDraft'
import SignupToast from '@/components/signup/SignupToast'
import SignupProgress from '@/components/signup/SignupProgress'
import SignupEmailPending from '@/components/signup/SignupEmailPending'
import SignupStepTerms from '@/components/signup/SignupStepTerms'
import SignupStepForm from '@/components/signup/SignupStepForm'
import SignupStepComplete from '@/components/signup/SignupStepComplete'
import { CONGREGANT_TYPE_OTHER } from '@/data/congregantTypes'
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

function hasStep1Progress(agreements) {
  return (
    isStep1Agreed(agreements.terms) ||
    isStep1Agreed(agreements.privacy) ||
    isStep1Agreed(agreements.consignment)
  )
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

function Signup() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isCompleteEntry = searchParams.get('step') === 'complete'
  const allowLeaveOnUnmountRef = useRef(isCompleteEntry)

  const [currentStep, setCurrentStep] = useState(() =>
    isCompleteEntry ? SIGNUP_STEP_COMPLETE : SIGNUP_STEP_TERMS,
  )
  const [step1Agreements, setStep1Agreements] = useState(INITIAL_STEP1_AGREEMENTS)
  const [form, setForm] = useState(INITIAL_SIGNUP_FORM)
  const [errors, setErrors] = useState({})
  const [isIdChecked, setIsIdChecked] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [idCheckMessage, setIdCheckMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailStatusMessage, setEmailStatusMessage] = useState('')
  const [resendAvailableAt, setResendAvailableAt] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [formFeedback, setFormFeedback] = useState(null)
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncingEmailVerification, setIsSyncingEmailVerification] = useState(false)
  const [isAutoCheckingEmail, setIsAutoCheckingEmail] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)
  const [toast, setToast] = useState(null)

  const showFeedback = useCallback((type, message, options = {}) => {
    const { toast = true } = options

    if (!type || !message) {
      setFormFeedback(null)
      setToast(null)
      return
    }

    setFormFeedback({ type, message })

    if (toast) {
      setToast({ type, message })
    } else {
      setToast(null)
    }
  }, [])

  const clearFeedback = useCallback(() => {
    showFeedback(null, null)
  }, [showFeedback])

  const allStep1RequiredChecked =
    isStep1Agreed(step1Agreements.terms) &&
    isStep1Agreed(step1Agreements.privacy) &&
    isStep1Agreed(step1Agreements.consignment)
  const allStep1Checked = allStep1RequiredChecked

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

  const shouldGuardLeave = useMemo(() => {
    if (currentStep === SIGNUP_STEP_COMPLETE) {
      return false
    }

    if (currentStep === SIGNUP_STEP_EMAIL_PENDING) {
      return true
    }

    if (currentStep === SIGNUP_STEP_FORM) {
      return isDirty
    }

    if (currentStep === SIGNUP_STEP_TERMS) {
      return hasStep1Progress(step1Agreements)
    }

    return false
  }, [currentStep, isDirty, step1Agreements])

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
    markSignupDraftDiscarded()
    clearSignupDraft()
    clearEmailVerifiedBeacon()
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const handleConfirmLeave = useCallback(() => {
    resetSignupForm()
  }, [resetSignupForm])

  const { isLeaveModalOpen, cancelLeave, confirmLeave, allowNavigation, requestNavigation } =
    useSignupLeaveGuard({
      isDirty: shouldGuardLeave,
      onConfirmLeave: handleConfirmLeave,
    })

  const allowNavigationAndLeave = useCallback(() => {
    allowLeaveOnUnmountRef.current = true
    allowNavigation()
  }, [allowNavigation])

  const handleSidebarTabChange = (tab) => {
    if (tab === 'login') {
      requestNavigation('/login')
      return
    }

    if (tab === 'find-id' || tab === 'find-password') {
      requestNavigation(`/login?tab=${tab}`)
    }
  }

  const syncEmailVerifiedFromSupabase = useCallback(
    async (email = form.email) => {
      const emailValue = typeof email === 'string' ? email : form.email
      const trimmedEmail = emailValue.trim()

      if (!trimmedEmail) {
        setIsEmailVerified(false)
        return { verified: false, result: null }
      }

      const result = await checkEmailVerificationStatus(trimmedEmail)

      if (result.verified) {
        setIsEmailVerified(true)
        setEmailSent(true)
        setErrors((prev) => ({ ...prev, email: undefined }))
        return { verified: true, result }
      }

      setIsEmailVerified(false)
      return { verified: false, result }
    },
    [form.email],
  )

  const finalizeSignup = useCallback(async () => {
    const lock = tryAcquireSignupLock('signup')

    if (!lock.acquired) {
      return false
    }

    setIsSubmitting(true)
    clearFeedback()

    const validation = validateForm(form, { isIdChecked, isEmailVerified: true })

    if (!validation.valid) {
      setErrors(validation.errors)
      setCurrentStep(SIGNUP_STEP_FORM)
      showFeedback('error', '입력 정보를 확인한 뒤 다시 가입을 진행해주세요.')
      setIsSubmitting(false)
      releaseSignupLock('signup')
      return false
    }

    let signupResult = null

    try {
      signupResult = await handleSignup(form)
    } catch (error) {
      console.error('[Signup] handleSignup 예외', error)
      showFeedback('error', '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsSubmitting(false)
      releaseSignupLock('signup')
      return false
    }

    if (!signupResult?.success) {
      if (signupResult?.message === SIGNUP_EMAIL_NOT_VERIFIED_MESSAGE) {
        setIsEmailVerified(false)
      }

      if (signupResult?.errors) {
        setErrors(signupResult.errors)
        setCurrentStep(SIGNUP_STEP_FORM)
      } else if (signupResult?.step === 'validation' || signupResult?.step === 'birthDate') {
        setCurrentStep(SIGNUP_STEP_FORM)
      }

      showFeedback('error', signupResult?.message ?? '회원가입에 실패했습니다.')
      setIsSubmitting(false)
      releaseSignupLock('signup')
      return false
    }

    try {
      allowNavigationAndLeave()
      clearEmailVerifiedBeacon()
      resetSignupForm()
      setStep1Agreements(INITIAL_STEP1_AGREEMENTS)
      setCurrentStep(SIGNUP_STEP_COMPLETE)
    } catch (postProcessError) {
      console.warn('[Signup] 회원가입 후처리(UI) 실패 — 회원가입은 성공', postProcessError)
      setCurrentStep(SIGNUP_STEP_COMPLETE)
    }

    releaseSignupLock('signup')
    setIsSubmitting(false)
    return true
  }, [allowNavigationAndLeave, clearFeedback, form, isEmailVerified, isIdChecked, resetSignupForm, showFeedback])

  useEffect(() => {
    if (isCompleteEntry) {
      return
    }

    markSignupDraftDiscarded()
    clearSignupDraft()
  }, [isCompleteEntry])

  useEffect(() => {
    return () => {
      if (!allowLeaveOnUnmountRef.current && shouldGuardLeave) {
        markSignupDraftDiscarded()
      }
    }
  }, [shouldGuardLeave])

  useEffect(() => {
    if (searchParams.get('step') !== 'complete') {
      return
    }

    setCurrentStep(SIGNUP_STEP_COMPLETE)
  }, [searchParams])

  useEffect(() => {
    const authStorageKey = getSupabaseAuthStorageKeyHint()
    const trimmedEmail = form.email.trim().toLowerCase()

    const handleStorage = (event) => {
      if (!event.key) {
        return
      }

      const isAuthStorageEvent =
        event.key.includes('-auth-token') || (authStorageKey && event.key === authStorageKey)
      const isBeaconEvent = event.key === 'skylove_signup_email_verified'

      if (isAuthStorageEvent || isBeaconEvent) {
        syncEmailVerifiedFromSupabase()
      }
    }

    const unsubscribeBroadcast = subscribeEmailVerified((email) => {
      if (email === trimmedEmail) {
        syncEmailVerifiedFromSupabase(email)
      }
    })

    window.addEventListener('storage', handleStorage)

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
        session?.user?.email?.toLowerCase() === trimmedEmail
      ) {
        syncEmailVerifiedFromSupabase(session.user.email)
      }
    })

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      subscription.unsubscribe()
      unsubscribeBroadcast()
    }
  }, [form.email, syncEmailVerifiedFromSupabase])

  useEffect(() => {
    if (currentStep !== SIGNUP_STEP_EMAIL_PENDING || !emailSent || isEmailVerified) {
      return undefined
    }

    const runSync = async () => {
      setIsAutoCheckingEmail(true)

      try {
        await syncEmailVerifiedFromSupabase()
      } finally {
        setIsAutoCheckingEmail(false)
      }
    }

    runSync()

    const timer = window.setInterval(runSync, 5000)

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
  }

  const updateField = (name, value) => {
    setForm((prev) => {
      if (name === 'congregantType' && value !== CONGREGANT_TYPE_OTHER) {
        return { ...prev, congregantType: value, attendingChurch: '' }
      }

      return { ...prev, [name]: value }
    })
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
      ...(name === 'congregantType' ? { attendingChurch: undefined } : {}),
    }))
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
    const emailValidation = validateSignupEmail(email)

    clearFeedback()

    if (!emailValidation.valid) {
      setErrors((prev) => ({ ...prev, email: emailValidation.errors.email }))
      showFeedback('error', emailValidation.errors.email)
      return
    }

    setIsSendingEmail(true)

    try {
      const alreadyVerified = await syncEmailVerifiedFromSupabase(email)

      if (alreadyVerified.verified) {
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
    setToast(null)

    try {
      const { verified, result } = await syncEmailVerifiedFromSupabase(email)

      if (verified) {
        setFormFeedback(null)
        setErrors((prev) => ({ ...prev, email: undefined }))
        setEmailStatusMessage('')
        return
      }

      const message =
        result?.hint ||
        '아직 이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 클릭한 뒤 다시 확인해주세요.'

      showFeedback('info', message, { toast: false })
    } catch (error) {
      console.error('[Signup] checkEmailVerificationStatus 예외', error)
      const message = '이메일 인증 확인에 실패했습니다. 다시 시도해주세요.'
      showFeedback('error', message, { toast: false })
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

      if (alreadyVerified.verified) {
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

    const { verified } = await syncEmailVerifiedFromSupabase()

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
              onCancel={() => requestNavigation('/login')}
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
