import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import BirthDateSelect from '@/components/signup/BirthDateSelect'
import PasswordInput from '@/components/signup/PasswordInput'
import SignupCongregantField from '@/components/signup/SignupCongregantField'
import SignupFormRow from '@/components/signup/SignupFormRow'
import {
  isCustomSecurityQuestionSelected,
  SECURITY_QUESTIONS,
  SECURITY_QUESTION_PLACEHOLDER,
} from '@/data/securityQuestions'
import { CONGREGANT_TYPE_OTHER } from '@/data/congregantTypes'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  checkDuplicateId,
  createOAuthProfile,
  formatPhoneNumber,
  getOAuthHomeUrl,
  getOAuthPrefillName,
  isSignupCompletedProfile,
  validateOAuthProfileForm,
} from '@/services/auth/oauthProfile'
import {
  getPasswordConfirmLiveError,
  getPasswordConfirmLiveSuccess,
  getPasswordRuleLiveError,
  getPasswordRuleLiveSuccess,
  isPasswordReadyForSignup,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIREMENT_HINT,
} from '@/services/auth/signup'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { AUTOCOMPLETE_OFF, SIGNUP_FIELD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import '@/pages/Signup.css'
import './OAuthProfileComplete.css'

const PASSWORD_CONFIRM_PLACEHOLDER = '비밀번호를 다시 입력해주세요'

const INITIAL_FORM = {
  loginId: '',
  password: '',
  passwordConfirm: '',
  name: '',
  birthDate: '',
  phone: '',
  email: '',
  agreeEmail: false,
  securityQuestion: '',
  securityCustomQuestion: '',
  securityAnswer: '',
  congregantType: '',
  attendingChurch: '',
}

function OAuthProfileComplete() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [isIdChecked, setIsIdChecked] = useState(false)
  const [idCheckMessage, setIdCheckMessage] = useState('')
  const [isCheckingId, setIsCheckingId] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function ensureSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      const user = currentSession?.user ?? session?.user ?? null

      if (!user) {
        if (!loading) {
          navigate('/login', { replace: true })
        }
        return
      }

      const existing = await fetchProfileByUserId(user.id)

      if (cancelled) {
        return
      }

      if (isSignupCompletedProfile(existing.success ? existing.profile : null)) {
        window.location.replace(getOAuthHomeUrl())
        return
      }

      setForm((prev) => ({
        ...prev,
        name: prev.name || getOAuthPrefillName(user),
        email: user.email || '',
      }))
      setSessionReady(true)
    }

    ensureSession()

    return () => {
      cancelled = true
    }
  }, [loading, navigate, session])

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
    setIdCheckMessage('')

    try {
      const result = await checkDuplicateId(loginId)
      setIsIdChecked(result.available)
      setIdCheckMessage(result.message)
      setErrors((prev) => ({
        ...prev,
        loginId: result.available ? undefined : '아이디가 이미 존재합니다.',
      }))
    } catch (error) {
      console.error('[OAuthProfileComplete] checkDuplicateId failed', error)
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

    const validation = validateOAuthProfileForm(form, { isIdChecked })
    setErrors(validation.errors)

    if (!validation.valid) {
      setFeedback({
        type: 'error',
        message: Object.values(validation.errors)[0] || '입력 정보를 확인해주세요.',
      })
      return
    }

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()
    const user = currentSession?.user ?? session?.user

    if (!user) {
      setFeedback({ type: 'error', message: '로그인 세션이 없습니다. 다시 간편 로그인을 진행해주세요.' })
      navigate('/login', { replace: true })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createOAuthProfile(user.id, {
        ...form,
        email: user.email || form.email,
      })

      if (!result.success) {
        if (result.errors) {
          setErrors((prev) => ({ ...prev, ...result.errors }))
        }
        setFeedback({
          type: 'error',
          message: result.message || '회원 정보 저장에 실패했습니다.',
        })
        return
      }

      // AuthContext 프로필 재로드를 위해 전체 이동 (기존 AuthContext API는 변경하지 않음)
      window.location.replace(getOAuthHomeUrl())
    } catch (error) {
      console.error('[OAuthProfileComplete] submit failed', error)
      setFeedback({
        type: 'error',
        message: '회원 정보 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const passwordRuleLiveError = getPasswordRuleLiveError(form.password)
  const passwordRuleLiveSuccess = getPasswordRuleLiveSuccess(form.password)
  const passwordConfirmLiveError = getPasswordConfirmLiveError(
    form.password,
    form.passwordConfirm,
    passwordConfirmTouched,
  )
  const passwordConfirmLiveSuccess = getPasswordConfirmLiveSuccess(
    form.password,
    form.passwordConfirm,
    passwordConfirmTouched,
  )

  const displayedPasswordError = errors.password || passwordRuleLiveError
  const displayedPasswordSuccess = displayedPasswordError ? undefined : passwordRuleLiveSuccess
  const displayedPasswordConfirmError = errors.passwordConfirm || passwordConfirmLiveError
  const displayedPasswordConfirmSuccess = displayedPasswordConfirmError
    ? undefined
    : passwordConfirmLiveSuccess
  const isPasswordReady = isPasswordReadyForSignup(form.password, form.passwordConfirm)

  if (!sessionReady) {
    return (
      <div className="category-layout oauth-complete-page">
        <div className="category-layout__inner">
          <div className="oauth-complete-page__loading" role="status">
            로그인 정보를 확인하고 있습니다...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="category-layout oauth-complete-page">
      <div className="category-layout__inner">
        <div className="category-layout__main">
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">추가 정보 입력</h1>
              <p className="sub-layout__subtitle">
                간편 로그인 최초 이용을 위해 회원 정보를 입력해주세요. 가입 후에는 아이디·비밀번호
                로그인과 카카오 로그인을 모두 사용할 수 있습니다.
              </p>
            </div>
            <AuthBreadcrumb label="추가 정보 입력" />
          </div>

          <form
            className="signup-info-form oauth-complete-form"
            onSubmit={handleSubmit}
            noValidate
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || event.target instanceof HTMLTextAreaElement) {
                return
              }

              const target = event.target

              if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
                return
              }

              event.preventDefault()
            }}
          >
            <header className="signup-info-form__header">
              <h2 className="signup-info-form__title">기본정보 입력</h2>
              <p className="signup-info-form__notice">
                <span className="signup-info-form__required" aria-hidden="true">
                  *
                </span>
                표시는 필수입력사항입니다.
              </p>
            </header>

            <div className="signup-info-form__panel">
              <SignupFormRow
                label="회원 아이디"
                required
                htmlFor="oauth-login-id"
                hint="4자리 이상, 영문·숫자·밑줄(_)만 사용할 수 있습니다."
                error={errors.loginId}
                success={!errors.loginId ? idCheckMessage : undefined}
              >
                <div className="signup-info-form__inline">
                  <input
                    id="oauth-login-id"
                    name="loginId"
                    type="text"
                    className="signup-info-form__input"
                    placeholder="아이디를 입력하세요."
                    value={form.loginId}
                    onChange={(event) => updateField('loginId', event.target.value)}
                    autoComplete={AUTOCOMPLETE_OFF}
                  />
                  <button
                    type="button"
                    className={`signup-btn signup-btn--gray${
                      isIdChecked ? ' signup-btn--gray-verified' : ''
                    }`}
                    onClick={handleDuplicateCheck}
                    disabled={isCheckingId}
                  >
                    {isCheckingId ? '확인 중...' : '중복확인'}
                  </button>
                </div>
              </SignupFormRow>

              <SignupFormRow
                label="비밀번호"
                required
                htmlFor="oauth-password"
                hint={PASSWORD_REQUIREMENT_HINT}
                alwaysShowHint
                reserveFeedback
                error={displayedPasswordError}
                success={displayedPasswordSuccess}
                rowClassName="signup-info-form__row--password"
              >
                <PasswordInput
                  id="oauth-password"
                  name="password"
                  placeholder={PASSWORD_PLACEHOLDER}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  className="signup-info-form__input"
                  wrapperClassName="signup-info-form__password"
                />
              </SignupFormRow>

              <SignupFormRow
                label="비밀번호 확인"
                required
                htmlFor="oauth-password-confirm"
                reserveFeedback
                error={displayedPasswordConfirmError}
                success={displayedPasswordConfirmSuccess}
                rowClassName="signup-info-form__row--password-confirm"
              >
                <PasswordInput
                  id="oauth-password-confirm"
                  name="passwordConfirm"
                  placeholder={PASSWORD_CONFIRM_PLACEHOLDER}
                  value={form.passwordConfirm}
                  onChange={(event) => {
                    setPasswordConfirmTouched(true)
                    updateField('passwordConfirm', event.target.value)
                  }}
                  className="signup-info-form__input"
                  wrapperClassName="signup-info-form__password"
                />
              </SignupFormRow>

              <SignupFormRow
                label="이메일"
                required
                htmlFor="oauth-email"
                hint="간편 로그인 계정의 이메일이 사용됩니다."
                alwaysShowHint
                error={errors.email}
              >
                <input
                  id="oauth-email"
                  name="email"
                  type="email"
                  className="signup-info-form__input"
                  value={form.email}
                  readOnly
                  disabled
                />
              </SignupFormRow>

              <SignupFormRow
                label="이름"
                required
                htmlFor="oauth-name"
                hint="실명으로 입력해주세요."
                error={errors.name}
              >
                <input
                  id="oauth-name"
                  name="name"
                  type="text"
                  className="signup-info-form__input"
                  placeholder="이름을 입력하세요."
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete={SIGNUP_FIELD_AUTOCOMPLETE_OFF}
                />
              </SignupFormRow>

              <SignupFormRow
                label="비밀번호 분실 시 질문"
                required
                htmlFor="oauth-security-question"
                error={errors.securityQuestion}
              >
                <select
                  id="oauth-security-question"
                  name="securityQuestion"
                  className="signup-info-form__input signup-info-form__select"
                  value={form.securityQuestion}
                  onChange={(event) => {
                    updateField('securityQuestion', event.target.value)
                    if (!isCustomSecurityQuestionSelected(event.target.value)) {
                      updateField('securityCustomQuestion', '')
                    }
                  }}
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
                  htmlFor="oauth-security-custom-question"
                  error={errors.securityCustomQuestion}
                >
                  <input
                    id="oauth-security-custom-question"
                    name="securityCustomQuestion"
                    type="text"
                    className="signup-info-form__input"
                    placeholder="비밀번호 찾기에 사용할 질문을 입력하세요."
                    value={form.securityCustomQuestion}
                    onChange={(event) => updateField('securityCustomQuestion', event.target.value)}
                    autoComplete={AUTOCOMPLETE_OFF}
                  />
                </SignupFormRow>
              )}

              <SignupFormRow
                label="답변 입력"
                required
                htmlFor="oauth-security-answer"
                error={errors.securityAnswer}
              >
                <input
                  id="oauth-security-answer"
                  name="securityAnswer"
                  type="text"
                  className="signup-info-form__input"
                  placeholder="비밀번호 찾기에 사용할 답변을 입력하세요."
                  value={form.securityAnswer}
                  onChange={(event) => updateField('securityAnswer', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </SignupFormRow>

              <SignupCongregantField
                form={form}
                errors={errors}
                updateField={updateField}
                idPrefix="oauth"
                radioName="oauthCongregantType"
              />

              <div className="signup-info-form__guide" role="note">
                <p className="signup-info-form__guide-title">비밀번호 찾기 안내</p>
                <ul className="signup-info-form__guide-list">
                  <li>
                    비밀번호를 분실한 경우, 이름·이메일과 함께 등록한 질문과 답변으로 본인 확인 후
                    재설정할 수 있습니다.
                  </li>
                  <li>
                    답변은 암호화되어 저장되며, 비밀번호 찾기 외 다른 용도로 사용되지 않습니다.
                  </li>
                </ul>
              </div>

              <SignupFormRow
                label="생년월일"
                required
                htmlFor="oauth-birth-year"
                error={errors.birthDate}
                rowClassName="signup-info-form__row--birth"
              >
                <BirthDateSelect
                  idPrefix="oauth-birth"
                  value={form.birthDate}
                  onChange={(nextValue) => updateField('birthDate', nextValue)}
                  className="signup-info-form__birth"
                />
              </SignupFormRow>

              <SignupFormRow label="휴대폰 번호" htmlFor="oauth-phone" error={errors.phone}>
                <input
                  id="oauth-phone"
                  name="phone"
                  type="tel"
                  className="signup-info-form__input"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </SignupFormRow>

              <SignupFormRow label="이메일 수신" htmlFor="oauth-agree-email">
                <label className="signup-info-form__checkbox-row" htmlFor="oauth-agree-email">
                  <input
                    id="oauth-agree-email"
                    type="checkbox"
                    className="signup-info-form__checkbox"
                    checked={form.agreeEmail}
                    onChange={(event) => updateField('agreeEmail', event.target.checked)}
                  />
                  <span>이메일 수신에 동의합니다. (선택)</span>
                </label>
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

            <div className="signup-info-form__actions">
              <button
                type="submit"
                className="signup-btn signup-btn--dark"
                disabled={isSubmitting || !isPasswordReady}
              >
                {isSubmitting ? '저장 중...' : '가입 완료'}
              </button>
              <Link to="/login" className="signup-btn signup-btn--cancel" replace>
                취소
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OAuthProfileComplete
