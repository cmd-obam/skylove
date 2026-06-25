import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Auth.css'

const DEFAULT_TAB = 'login'

const FOOTER_LINKS = [
  { id: 'find-id', label: '아이디 찾기' },
  { id: 'find-password', label: '비밀번호 찾기' },
  { id: 'signup', label: '회원가입' },
]

const VALID_TABS = new Set([DEFAULT_TAB, ...FOOTER_LINKS.map((item) => item.id)])

function Auth() {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab') ?? DEFAULT_TAB
    return VALID_TABS.has(tab) ? tab : DEFAULT_TAB
  }, [searchParams])

  const handleTabChange = (tabId) => {
    if (tabId === DEFAULT_TAB) {
      setSearchParams({})
      return
    }

    setSearchParams({ tab: tabId })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <header className="auth-page__header">
          <h1 className="auth-page__title">로그인</h1>
          <p className="auth-page__description">하늘사랑교회 홈페이지에 오신 것을 환영합니다.</p>
        </header>

        <section className="auth-card" aria-label="회원 서비스">
          {activeTab === 'login' && (
            <form className="auth-login" onSubmit={handleSubmit}>
              <input
                id="login-id"
                name="loginId"
                type="text"
                className="auth-form__input"
                placeholder="아이디를 입력하세요"
                aria-label="아이디"
                autoComplete="username"
              />
              <input
                id="login-password"
                name="password"
                type="password"
                className="auth-form__input"
                placeholder="비밀번호를 입력하세요"
                aria-label="비밀번호"
                autoComplete="current-password"
              />
              <button type="submit" className="auth-login__submit">
                로그인
              </button>
            </form>
          )}

          {activeTab === 'find-id' && (
            <form className="auth-sub-form" onSubmit={handleSubmit}>
              <h2 className="auth-sub-form__title">아이디 찾기</h2>
              <input
                name="name"
                type="text"
                className="auth-form__input"
                aria-label="이름"
                autoComplete="name"
              />
              <input
                name="email"
                type="email"
                className="auth-form__input"
                aria-label="이메일"
                autoComplete="email"
              />
              <button type="submit" className="auth-sub-form__submit">
                아이디 찾기
              </button>
            </form>
          )}

          {activeTab === 'find-password' && (
            <form className="auth-sub-form" onSubmit={handleSubmit}>
              <h2 className="auth-sub-form__title">비밀번호 찾기</h2>
              <input
                name="loginId"
                type="text"
                className="auth-form__input"
                aria-label="아이디"
                autoComplete="username"
              />
              <input
                name="email"
                type="email"
                className="auth-form__input"
                aria-label="이메일"
                autoComplete="email"
              />
              <button type="submit" className="auth-sub-form__submit">
                비밀번호 찾기
              </button>
            </form>
          )}

          {activeTab === 'signup' && (
            <form className="auth-sub-form" onSubmit={handleSubmit}>
              <h2 className="auth-sub-form__title">회원가입</h2>
              <input
                name="loginId"
                type="text"
                className="auth-form__input"
                aria-label="아이디"
                autoComplete="username"
              />
              <input
                name="password"
                type="password"
                className="auth-form__input"
                aria-label="비밀번호"
                autoComplete="new-password"
              />
              <input
                name="passwordConfirm"
                type="password"
                className="auth-form__input"
                aria-label="비밀번호 확인"
                autoComplete="new-password"
              />
              <input
                name="name"
                type="text"
                className="auth-form__input"
                aria-label="이름"
                autoComplete="name"
              />
              <input
                name="email"
                type="email"
                className="auth-form__input"
                aria-label="이메일"
                autoComplete="email"
              />
              <button type="submit" className="auth-sub-form__submit">
                회원가입
              </button>
            </form>
          )}

          <nav className="auth-card__footer" aria-label="회원 메뉴">
            {FOOTER_LINKS.map((item, index) => (
              <span key={item.id} className="auth-card__footer-item">
                {index > 0 && (
                  <span className="auth-card__footer-separator" aria-hidden="true">
                    |
                  </span>
                )}
                <button
                  type="button"
                  className={`auth-card__footer-link${
                    activeTab === item.id ? ' auth-card__footer-link--active' : ''
                  }`}
                  onClick={() => handleTabChange(item.id)}
                >
                  {item.label}
                </button>
              </span>
            ))}
          </nav>
        </section>
      </div>
    </div>
  )
}

export default Auth
