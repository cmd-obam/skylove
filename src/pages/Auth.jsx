import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthBreadcrumb from '@/components/auth/AuthBreadcrumb'
import MemberMenuSidebar from '@/components/auth/MemberMenuSidebar'
import {
  findUsernameByNameEmail,
  verifyMemberForPasswordReset,
} from '@/services/auth/accountRecovery'
import { AUTH_MESSAGES } from '@/constants/authMessages'
import { setPasswordResetSession } from '@/utils/passwordResetSession'
import { handleLogin } from '@/services/auth/login'
import { clearSavedLoginId, getSavedLoginId, setSavedLoginId } from '@/utils/savedLoginId'
import { AUTOCOMPLETE_OFF, PASSWORD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import '@/components/layout/CategoryLayout.css'
import '@/components/layout/SubLayout.css'
import './Auth.css'

const DEFAULT_TAB = 'login'

const FOOTER_LINKS = [
  { id: 'find-id', label: '아이디 찾기' },
  { id: 'find-password', label: '비밀번호 찾기' },
  { id: 'signup', label: '회원가입', path: '/signup' },
]

const VALID_TABS = new Set([DEFAULT_TAB, ...FOOTER_LINKS.filter((item) => !item.path).map((item) => item.id)])

const PAGE_CONTENT = {
  login: {
    title: '회원 로그인',
    subtitle: '하늘사랑교회 홈페이지에 오신 것을 환영합니다.',
    breadcrumb: '회원 로그인',
  },
  'find-id': {
    title: '아이디 찾기',
    subtitle: '가입 시 등록한 이름과 이메일로 아이디를 찾을 수 있습니다.',
    breadcrumb: '아이디 찾기',
  },
  'find-password': {
    title: '비밀번호 찾기',
    subtitle: '가입 시 등록한 이름과 이메일로 본인 확인 후 비밀번호를 재설정할 수 있습니다.',
    breadcrumb: '비밀번호 찾기',
  },
}

function Auth() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [rememberId, setRememberId] = useState(false)
  const [loginFeedback, setLoginFeedback] = useState(null)
  const [formFeedback, setFormFeedback] = useState(null)
  const [findIdResult, setFindIdResult] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') ?? DEFAULT_TAB
    return VALID_TABS.has(tab) ? tab : DEFAULT_TAB
  }, [searchParams])

  const pageContent = PAGE_CONTENT[activeTab] ?? PAGE_CONTENT.login

  useEffect(() => {
    const savedLoginId = getSavedLoginId()

    if (savedLoginId) {
      setLoginId(savedLoginId)
      setRememberId(true)
    }
  }, [])

  const handleTabChange = (tabId) => {
    setFormFeedback(null)
    setLoginFeedback(null)
    setFindIdResult(null)

    if (tabId === DEFAULT_TAB) {
      setSearchParams({})
      return
    }

    setSearchParams({ tab: tabId })
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setLoginFeedback(null)

    try {
      const result = await handleLogin({ loginId, password })

      if (result.success) {
        if (rememberId) {
          setSavedLoginId(loginId)
        } else {
          clearSavedLoginId()
        }

        navigate('/')
        return
      }

      setLoginFeedback(result.message)
    } catch {
      setLoginFeedback('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFindIdSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormFeedback(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await findUsernameByNameEmail({
        name: formData.get('name'),
        email: formData.get('email'),
      })

      if (result.success) {
        setFindIdResult({ username: result.username })
        setFormFeedback(null)
        return
      }

      setFindIdResult(null)
      setFormFeedback({
        type: 'error',
        message:
          result.message === AUTH_MESSAGES.memberNotFound
            ? '일치하는 회원정보가 없습니다.'
            : result.message,
      })
    } catch {
      setFindIdResult(null)
      setFormFeedback({
        type: 'error',
        message: '아이디 찾기 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFindPasswordSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormFeedback(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await verifyMemberForPasswordReset({
        name: formData.get('name'),
        email: formData.get('email'),
      })

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        return
      }

      setPasswordResetSession({
        email: result.email,
        name: result.name,
      })

      navigate('/reset-password/security-question', {
        state: {
          email: result.email,
          name: result.name,
        },
      })
    } catch {
      setFormFeedback({
        type: 'error',
        message: '비밀번호 찾기 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="category-layout auth-page">
      <div className="category-layout__inner">
        <MemberMenuSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="category-layout__main auth-page__main">
          <div className="sub-layout__header">
            <div className="sub-layout__heading">
              <h1 className="sub-layout__title">{pageContent.title}</h1>
              <p className="sub-layout__subtitle">{pageContent.subtitle}</p>
            </div>
            <AuthBreadcrumb label={pageContent.breadcrumb} />
          </div>

          <div className="auth-page__body" aria-label="회원 서비스">
            {activeTab === 'login' && (
              <form className="auth-login" onSubmit={handleLoginSubmit} autoComplete="off">
                <input
                  id="login-id"
                  name="loginId"
                  type="text"
                  className="auth-form__input"
                  placeholder="아이디"
                  aria-label="아이디"
                  autoComplete={AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  className="auth-form__input"
                  placeholder="비밀번호"
                  aria-label="비밀번호"
                  autoComplete={PASSWORD_AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <label className="auth-login__remember">
                  <input
                    type="checkbox"
                    className="auth-login__checkbox"
                    checked={rememberId}
                    onChange={(event) => setRememberId(event.target.checked)}
                  />
                  <span>아이디 저장</span>
                </label>

                <button type="submit" className="auth-login__submit" disabled={isSubmitting}>
                  {isSubmitting ? '로그인 중...' : '로그인'}
                </button>

                {loginFeedback && (
                  <p className="auth-form__feedback auth-form__feedback--error" role="alert">
                    {loginFeedback}
                  </p>
                )}
              </form>
            )}

            {activeTab === 'find-id' && findIdResult?.username && (
              <div className="auth-find-id-result">
                <div className="auth-find-id-result__card">
                  <p className="auth-find-id-result__lead">회원님의 아이디</p>
                  <div className="auth-find-id-result__rule" aria-hidden="true" />
                  <span className="auth-find-id-result__username">{findIdResult.username}</span>
                  <div className="auth-find-id-result__rule" aria-hidden="true" />
                  <p className="auth-find-id-result__suffix">입니다.</p>
                </div>
                <Link to="/login" className="auth-sub-form__submit auth-find-id-result__login">
                  로그인 하기
                </Link>
              </div>
            )}

            {activeTab === 'find-id' && !findIdResult?.username && (
              <form className="auth-sub-form" onSubmit={handleFindIdSubmit} autoComplete="off">
                <input
                  name="name"
                  type="text"
                  className="auth-form__input"
                  placeholder="이름"
                  aria-label="이름"
                  autoComplete={AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <input
                  name="email"
                  type="email"
                  className="auth-form__input"
                  placeholder="이메일"
                  aria-label="이메일"
                  autoComplete={AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button type="submit" className="auth-sub-form__submit" disabled={isSubmitting}>
                  {isSubmitting ? '확인 중...' : '아이디 찾기'}
                </button>
                {formFeedback?.type === 'error' && (
                  <p className="auth-form__feedback auth-form__feedback--error" role="alert">
                    {formFeedback.message}
                  </p>
                )}
              </form>
            )}

            {activeTab === 'find-password' && (
              <form className="auth-sub-form" onSubmit={handleFindPasswordSubmit} autoComplete="off">
                <input
                  name="name"
                  type="text"
                  className="auth-form__input"
                  placeholder="이름"
                  aria-label="이름"
                  autoComplete={AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <input
                  name="email"
                  type="email"
                  className="auth-form__input"
                  placeholder="이메일"
                  aria-label="이메일"
                  autoComplete={AUTOCOMPLETE_OFF}
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button type="submit" className="auth-sub-form__submit" disabled={isSubmitting}>
                  {isSubmitting ? '확인 중...' : '다음'}
                </button>
                {formFeedback && (
                  <p
                    className={`auth-form__feedback auth-form__feedback--${formFeedback.type}${
                      formFeedback.type === 'success' ? ' auth-form__feedback--multiline' : ''
                    }`}
                    role={formFeedback.type === 'error' ? 'alert' : 'status'}
                  >
                    {formFeedback.message}
                  </p>
                )}
              </form>
            )}

            <nav className="auth-page__footer" aria-label="회원 안내 링크">
              {FOOTER_LINKS.map((item, index) => (
                <span key={item.id} className="auth-page__footer-item">
                  {index > 0 && (
                    <span className="auth-page__footer-separator" aria-hidden="true">
                      |
                    </span>
                  )}
                  {item.path ? (
                    <Link to={item.path} className="auth-page__footer-link">
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`auth-page__footer-link${
                        activeTab === item.id ? ' auth-page__footer-link--active' : ''
                      }`}
                      onClick={() => handleTabChange(item.id)}
                    >
                      {item.label}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Auth
