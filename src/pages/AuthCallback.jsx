import { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import {
  AUTH_CROSS_BROWSER_HINT,
  AUTH_CROSS_BROWSER_MESSAGE,
  toAuthCallbackUserMessage,
} from '@/services/auth/authErrors'
import {
  isEmailConfirmed,
  parseAuthCallbackParams,
  resolveAuthCallbackSession,
} from '@/services/auth/authCallbackSession'
import {
  broadcastEmailVerified,
  setEmailVerifiedBeacon,
} from '@/utils/signupDraft'
import './AuthCallback.css'

const SUCCESS_DISPLAY_DELAY_MS = 3000

const SUCCESS_BODY =
  '기존에 작성 중인 회원가입 탭으로 이동하여\n회원가입을 계속 진행해주세요.\n\n회원가입 페이지는 이미 인증 완료 상태로 변경되어 있습니다.\n\n이 창은 닫으셔도 됩니다.'

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * AuthCallback은 인증 완료만 수행합니다.
 * - 허용: exchangeCodeForSession / verifyOtp(token_hash) via resolveAuthCallbackSession
 * - 금지: signInWithOtp / OTP 재발송 (supabase.js otpSendGuard가 차단)
 *   회원가입 메일 발송(signUp/resend)은 이 라우트에서 호출하지 않습니다.
 */
function AuthCallbackLoading() {
  return (
    <div className="auth-callback-page__panel" role="status" aria-live="polite">
      <div className="auth-callback-page__spinner" aria-hidden="true" />
      <h1 className="auth-callback-page__title">인증 정보를 확인하고 있습니다.</h1>
      <p className="auth-callback-page__text">이메일 인증을 처리하고 있습니다...</p>
    </div>
  )
}

function AuthCallbackSuccess({ onClose }) {
  return (
    <div className="auth-callback-page__panel" role="status" aria-live="polite">
      <div className="auth-callback-page__icon" aria-hidden="true">
        <FiCheckCircle />
      </div>
      <h1 className="auth-callback-page__title">이메일 인증이 완료되었습니다.</h1>
      <p className="auth-callback-page__text">{SUCCESS_BODY}</p>
      <button type="button" className="auth-callback-page__button" onClick={onClose}>
        창 닫기
      </button>
    </div>
  )
}

function AuthCallbackError({ message }) {
  const isCrossBrowser = String(message || '').includes(AUTH_CROSS_BROWSER_MESSAGE)
  const body = isCrossBrowser
    ? AUTH_CROSS_BROWSER_HINT
    : message || '회원가입 페이지에서 인증 메일을 다시 요청한 뒤, 최신 링크를 클릭해주세요.'

  return (
    <div className="auth-callback-page__panel" role="alert">
      <div className="auth-callback-page__icon auth-callback-page__icon--error" aria-hidden="true">
        <FiAlertCircle />
      </div>
      <h1 className="auth-callback-page__title">
        {isCrossBrowser ? AUTH_CROSS_BROWSER_MESSAGE : '이메일 인증에 실패했습니다.'}
      </h1>
      <p className="auth-callback-page__text">{body}</p>
    </div>
  )
}

function AuthCallback() {
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const runIdRef = useRef(0)
  const statusRef = useRef('loading')

  const setCallbackStatus = (nextStatus, runId, reason) => {
    console.log(`[AuthCallback][run:${runId}][setCallbackStatus]`, {
      from: statusRef.current,
      to: nextStatus,
      reason,
      isLatestRun: runId === runIdRef.current,
    })

    if (runId !== runIdRef.current) {
      return
    }

    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  useEffect(() => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId

    console.log(`[AuthCallback][run:${runId}] effect start`, {
      url: window.location.href,
      params: parseAuthCallbackParams(),
    })

    async function completeEmailVerification() {
      try {
        // Completion only — never request a new OTP from this route.
        // in-flight Promise 로 StrictMode 이중 호출을 합칩니다.
        const session = await resolveAuthCallbackSession(runId)
        const user = session?.user ?? null

        console.log(`[AuthCallback][run:${runId}] session resolved`, {
          email: user?.email ?? null,
          emailConfirmedAt: user?.email_confirmed_at ?? null,
          isEmailConfirmed: user ? isEmailConfirmed(user) : false,
          isLatestRun: runId === runIdRef.current,
        })

        if (!user?.email) {
          throw new Error('이메일 인증 정보를 확인하지 못했습니다.')
        }

        if (!isEmailConfirmed(user)) {
          throw new Error('이메일 인증 상태를 확인하지 못했습니다.')
        }

        const sessionEmail = user.email.trim().toLowerCase()
        setEmailVerifiedBeacon(sessionEmail)
        broadcastEmailVerified(sessionEmail)

        await sleep(SUCCESS_DISPLAY_DELAY_MS)

        // StrictMode 첫 effect 가 unmount 되어도, 최신 run 이면 성공 UI를 표시합니다.
        setCallbackStatus('success', runId, 'verification-complete')
      } catch (error) {
        console.error(`[AuthCallback][run:${runId}] completeEmailVerification failed`, error)

        if (runId === runIdRef.current) {
          setErrorMessage(toAuthCallbackUserMessage(error))
          setCallbackStatus('error', runId, 'verification-failed')
        }
      }
    }

    completeEmailVerification()
  }, [])

  const handleClose = () => {
    window.close()
  }

  return (
    <div className="auth-callback-page">
      <section className="auth-callback-page__card" aria-label="이메일 인증 처리">
        {status === 'loading' && <AuthCallbackLoading />}
        {status === 'success' && <AuthCallbackSuccess onClose={handleClose} />}
        {status === 'error' && <AuthCallbackError message={errorMessage} />}
      </section>
    </div>
  )
}

export default AuthCallback
