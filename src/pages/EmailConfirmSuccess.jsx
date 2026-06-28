import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import './Signup.css'

function EmailConfirmSuccess() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function confirmEmailFromUrl() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const hasAuthHash = hashParams.has('access_token') || hashParams.has('error')

      if (hasAuthHash) {
        const { error } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        if (error) {
          console.error('[EmailConfirm] session exchange failed', error)
          setStatus('error')
          return
        }
      }

      if (!isMounted) {
        return
      }

      setStatus('success')
    }

    confirmEmailFromUrl()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="signup-page">
      <div className="signup-page__container">
        <section className="signup-card" aria-label="이메일 인증 완료">
          <header className="signup-card__header">
            <h1 className="signup-card__title">이메일 인증</h1>
            <div className="signup-card__accent" aria-hidden="true" />
          </header>

          {status === 'loading' && (
            <div className="signup-verify-panel">
              <p className="signup-verify-panel__text">인증 결과를 확인하고 있습니다...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="signup-verify-panel">
              <p className="signup-verify-panel__icon" aria-hidden="true">
                ✅
              </p>
              <h2 className="signup-verify-panel__title">이메일 인증이 완료되었습니다.</h2>
              <p className="signup-verify-panel__text">
                이 창은 닫으셔도 됩니다.
                {'\n\n'}
                회원가입 페이지로 돌아가
                {'\n'}
                회원가입을 완료해주세요.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="signup-verify-panel">
              <p
                className="signup-form__feedback signup-form__feedback--error"
                role="alert"
              >
                이메일 인증 처리 중 오류가 발생했습니다. 인증 메일의 링크를 다시 클릭하거나, 회원가입
                페이지에서 인증 메일을 다시 요청해주세요.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default EmailConfirmSuccess
