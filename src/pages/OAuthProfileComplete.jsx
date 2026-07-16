import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import BirthDateSelect from '@/components/signup/BirthDateSelect'
import {
  isCustomSecurityQuestionSelected,
  SECURITY_QUESTIONS,
  SECURITY_QUESTION_PLACEHOLDER,
} from '@/data/securityQuestions'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  checkDuplicateId,
  createOAuthProfile,
  formatPhoneNumber,
  getOAuthHomeUrl,
  validateOAuthProfileForm,
} from '@/services/auth/oauthProfile'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import '@/pages/Signup.css'
import './OAuthProfileComplete.css'

const INITIAL_FORM = {
  name: '',
  loginId: '',
  birthDate: '',
  phone: '',
  email: '',
  agreeEmail: false,
  securityQuestion: '',
  securityCustomQuestion: '',
  securityAnswer: '',
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

      if (existing.success && existing.profile) {
        window.location.replace(getOAuthHomeUrl())
        return
      }

      setForm((prev) => ({
        ...prev,
        name: prev.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
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
      setErrors((prev) => ({ ...prev, loginId: '회원아이디를 입력해주세요.' }))
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
                간편 로그인 최초 이용을 위해 회원 정보를 입력해주세요.
              </p>
            </div>
            <AuthBreadcrumb label="추가 정보 입력" />
          </div>

          <form className="signup-info-form oauth-complete-form" onSubmit={handleSubmit} noValidate>
            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-name">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  이름
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <input
                  id="oauth-name"
                  className="signup-info-form__input"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
                {errors.name && (
                  <p className="signup-info-form__message signup-info-form__message--error">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-login-id">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  회원아이디
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <div className="signup-info-form__inline">
                  <input
                    id="oauth-login-id"
                    className="signup-info-form__input"
                    value={form.loginId}
                    onChange={(event) => updateField('loginId', event.target.value)}
                    autoComplete={AUTOCOMPLETE_OFF}
                    placeholder="4~20자 영문, 숫자, _"
                  />
                  <button
                    type="button"
                    className="signup-btn signup-btn--gray"
                    onClick={handleDuplicateCheck}
                    disabled={isCheckingId}
                  >
                    {isCheckingId ? '확인 중...' : '중복확인'}
                  </button>
                </div>
                {idCheckMessage && !errors.loginId && (
                  <p className="signup-info-form__message signup-info-form__message--success">
                    {idCheckMessage}
                  </p>
                )}
                {errors.loginId && (
                  <p className="signup-info-form__message signup-info-form__message--error">
                    {errors.loginId}
                  </p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-birth-year">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  생년월일
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <BirthDateSelect
                  idPrefix="oauth-birth"
                  value={form.birthDate}
                  onChange={(value) => updateField('birthDate', value)}
                />
                {errors.birthDate && (
                  <p className="signup-info-form__message signup-info-form__message--error">
                    {errors.birthDate}
                  </p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-phone">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  휴대폰
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <input
                  id="oauth-phone"
                  className="signup-info-form__input"
                  value={form.phone}
                  onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
                  inputMode="numeric"
                  autoComplete={AUTOCOMPLETE_OFF}
                  placeholder="010-0000-0000"
                />
                {errors.phone && (
                  <p className="signup-info-form__message signup-info-form__message--error">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <span className="signup-info-form__label">이메일</span>
              </div>
              <div className="signup-info-form__control-cell">
                <input
                  className="signup-info-form__input"
                  value={form.email}
                  readOnly
                  disabled
                />
                <p className="signup-info-form__hint">간편 로그인 계정의 이메일이 사용됩니다.</p>
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-security-question">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  비밀번호 찾기 질문
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <select
                  id="oauth-security-question"
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
                {isCustomSecurityQuestionSelected(form.securityQuestion) && (
                  <input
                    className="signup-info-form__input"
                    style={{ marginTop: '0.5rem' }}
                    value={form.securityCustomQuestion}
                    onChange={(event) => updateField('securityCustomQuestion', event.target.value)}
                    placeholder="질문을 직접 입력하세요."
                    autoComplete={AUTOCOMPLETE_OFF}
                  />
                )}
                {(errors.securityQuestion || errors.securityCustomQuestion) && (
                  <p className="signup-info-form__message signup-info-form__message--error">
                    {errors.securityQuestion || errors.securityCustomQuestion}
                  </p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <label className="signup-info-form__label" htmlFor="oauth-security-answer">
                  <span className="signup-info-form__required" aria-hidden="true">
                    *
                  </span>{' '}
                  비밀번호 찾기 답변
                </label>
              </div>
              <div className="signup-info-form__control-cell">
                <input
                  id="oauth-security-answer"
                  className="signup-info-form__input"
                  value={form.securityAnswer}
                  onChange={(event) => updateField('securityAnswer', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
                {errors.securityAnswer && (
                  <p className="signup-info-form__message signup-info-form__message--error">
                    {errors.securityAnswer}
                  </p>
                )}
              </div>
            </div>

            <div className="signup-info-form__row">
              <div className="signup-info-form__label-cell">
                <span className="signup-info-form__label">이메일 수신동의</span>
              </div>
              <div className="signup-info-form__control-cell">
                <label className="signup-info-form__checkbox-row">
                  <input
                    type="checkbox"
                    className="signup-info-form__checkbox"
                    checked={form.agreeEmail}
                    onChange={(event) => updateField('agreeEmail', event.target.checked)}
                  />
                  <span>이메일 수신에 동의합니다. (선택)</span>
                </label>
              </div>
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
              <button type="submit" className="signup-btn signup-btn--dark" disabled={isSubmitting}>
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
