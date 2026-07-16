import { useState } from 'react'
import { startOAuthLogin } from '@/services/auth/oauthLogin'

function AuthOAuthButtons() {
  const [pendingProvider, setPendingProvider] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleOAuthClick = async (provider) => {
    if (pendingProvider) {
      return
    }

    setPendingProvider(provider)
    setErrorMessage('')

    try {
      const result = await startOAuthLogin(provider)

      if (!result.success) {
        setErrorMessage(result.message || '간편 로그인을 시작하지 못했습니다.')
        setPendingProvider(null)
      }
      // 성공 시 provider 리다이렉트로 페이지를 떠나므로 pending 유지
    } catch (error) {
      console.error('[OAuth] button click failed', error)
      setErrorMessage('간편 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
      setPendingProvider(null)
    }
  }

  return (
    <div className="auth-oauth" aria-label="간편 로그인">
      <div className="auth-oauth__divider" role="separator" aria-label="또는">
        <span className="auth-oauth__divider-line" aria-hidden="true" />
        <span className="auth-oauth__divider-text">또는</span>
        <span className="auth-oauth__divider-line" aria-hidden="true" />
      </div>

      <div className="auth-oauth__actions">
        <button
          type="button"
          className="auth-oauth__button auth-oauth__button--kakao"
          onClick={() => handleOAuthClick('kakao')}
          disabled={Boolean(pendingProvider)}
        >
          {pendingProvider === 'kakao' ? '카카오 연결 중...' : '카카오로 시작하기'}
        </button>
        <button
          type="button"
          className="auth-oauth__button auth-oauth__button--naver"
          onClick={() => handleOAuthClick('naver')}
          disabled={Boolean(pendingProvider)}
        >
          {pendingProvider === 'naver' ? '네이버 연결 중...' : '네이버로 시작하기'}
        </button>
      </div>

      {errorMessage && (
        <p className="auth-form__feedback auth-form__feedback--error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default AuthOAuthButtons
