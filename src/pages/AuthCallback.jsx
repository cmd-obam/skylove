import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  isEmailConfirmed,
  resolveAuthCallbackSession,
} from '@/services/auth/authCallbackSession'
import {
  broadcastEmailVerified,
  setEmailVerifiedBeacon,
} from '@/utils/signupDraft'
import './Signup.css'

function AuthCallback() {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...')
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) {
      return undefined
    }

    hasStartedRef.current = true
    let isMounted = true

    async function completeEmailVerification() {
      try {
        const session = await resolveAuthCallbackSession()
        const user = session?.user

        if (!user?.email) {
          throw new Error('이메일 인증 정보를 확인하지 못했습니다. 인증 메일의 링크를 다시 클릭해주세요.')
        }

        if (!isEmailConfirmed(user)) {
          throw new Error('이메일 인증 상태를 확인하지 못했습니다. 인증 메일의 링크를 다시 클릭해주세요.')
        }

        const sessionEmail = user.email.trim().toLowerCase()

        setEmailVerifiedBeacon(sessionEmail)
        broadcastEmailVerified(sessionEmail)

        if (!isMounted) {
          return
        }

        setStatus('success')
        setMessage(
          '이메일 인증이 완료되었습니다.\n\n회원가입 페이지로 돌아가시면 자동으로 가입이 완료됩니다.\n이 탭은 닫으셔도 됩니다.',
        )

        if (window.opener && !window.opener.closed) {
          window.setTimeout(() => {
            window.close()
          }, 1500)
        }
      } catch (error) {
        console.error('[AuthCallback] 이메일 인증 콜백 처리 실패', error)

        if (!isMounted) {
          return
        }

        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : '이메일 인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        )
      }
    }

    completeEmailVerification()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="signup-page">
      <div className="signup-page__container">
        <section className="signup-card" aria-label="이메일 인증 처리">
          <header className="signup-card__header">
            <h1 className="signup-card__title">이메일 인증 처리</h1>
            <div className="signup-card__accent" aria-hidden="true" />
          </header>

          <div className="signup-verify-panel">
            {status === 'success' && (
              <p className="signup-verify-panel__icon" aria-hidden="true">
                ✓
              </p>
            )}
            <h2 className="signup-verify-panel__title">
              {status === 'loading'
                ? '인증 정보를 확인하고 있습니다.'
                : status === 'success'
                  ? '이메일 인증이 완료되었습니다.'
                  : '이메일 인증 처리에 실패했습니다.'}
            </h2>
            <p className="signup-verify-panel__text">{message}</p>
            {status === 'success' && (
              <Link to="/signup" className="signup-btn signup-btn--primary signup-btn--full">
                회원가입 페이지로 이동
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthCallback
