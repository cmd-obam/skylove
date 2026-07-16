import { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import {
  isEmailConfirmed,
  parseAuthCallbackParams,
  resolveAuthCallbackSession,
  syncSupabaseAuthSession,
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

async function logAuthSnapshot(runId, step) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  let refreshResult = null

  if (session) {
    const { data, error } = await supabase.auth.refreshSession()
    refreshResult = {
      hasSession: Boolean(data.session),
      userEmail: data.session?.user?.email ?? null,
      emailConfirmedAt: data.session?.user?.email_confirmed_at ?? null,
      error: error?.message ?? null,
    }
  }

  console.log(`[AuthCallback][run:${runId}][${step}]`, {
    callbackState: step,
    url: window.location.href,
    params: parseAuthCallbackParams(),
    session: session
      ? {
          userId: session.user?.id ?? null,
          email: session.user?.email ?? null,
          emailConfirmedAt: session.user?.email_confirmed_at ?? null,
        }
      : null,
    sessionError: sessionError?.message ?? null,
    user: user
      ? {
          id: user.id,
          email: user.email,
          emailConfirmedAt: user.email_confirmed_at ?? null,
          confirmedAt: user.confirmed_at ?? null,
        }
      : null,
    userError: userError?.message ?? null,
    refreshSession: refreshResult,
  })

  return { session, user, sessionError, userError }
}

async function waitForConfirmedUser(runId, initialUser, maxAttempts = 6) {
  let user = initialUser

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    console.log(`[AuthCallback][run:${runId}][waitForConfirmedUser] attempt ${attempt + 1}`, {
      email: user?.email ?? null,
      emailConfirmedAt: user?.email_confirmed_at ?? null,
      isEmailConfirmed: user ? isEmailConfirmed(user) : false,
    })

    if (user?.email && isEmailConfirmed(user)) {
      return user
    }

    await supabase.auth.refreshSession()

    const {
      data: { user: refreshedUser },
      error,
    } = await supabase.auth.getUser()

    if (!error && refreshedUser) {
      user = refreshedUser
    }

    if (user?.email && isEmailConfirmed(user)) {
      return user
    }

    await sleep(350)
  }

  return user
}

async function resolveVerifiedUserFromSession(runId, initialSession) {
  let user = initialSession?.user ?? null

  if (user?.email && isEmailConfirmed(user)) {
    console.log(`[AuthCallback][run:${runId}][resolveVerifiedUserFromSession] already confirmed`)
    return user
  }

  console.log(`[AuthCallback][run:${runId}][resolveVerifiedUserFromSession] syncing session`)
  await syncSupabaseAuthSession({ retries: 10, retryDelayMs: 300 })
  await logAuthSnapshot(runId, 'after-syncSupabaseAuthSession')

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    user = session.user
  }

  return waitForConfirmedUser(runId, user)
}

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
  return (
    <div className="auth-callback-page__panel" role="alert">
      <div className="auth-callback-page__icon auth-callback-page__icon--error" aria-hidden="true">
        <FiAlertCircle />
      </div>
      <h1 className="auth-callback-page__title">이메일 인증에 실패했습니다.</h1>
      <p className="auth-callback-page__text">
        {message || '인증 메일을 다시 요청해주세요.'}
      </p>
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
      console.log(`[AuthCallback][run:${runId}][setCallbackStatus] skipped — stale run`)
      return
    }

    statusRef.current = nextStatus
    setStatus(nextStatus)
  }

  useEffect(() => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    let cancelled = false

    console.log(`[AuthCallback][run:${runId}] effect start`, {
      callbackState: statusRef.current,
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log(`[AuthCallback][run:${runId}][onAuthStateChange]`, {
        authEvent: event,
        email: nextSession?.user?.email ?? null,
        emailConfirmedAt: nextSession?.user?.email_confirmed_at ?? null,
        callbackState: statusRef.current,
      })
    })

    async function completeEmailVerification() {
      try {
        await logAuthSnapshot(runId, 'start')

        console.log(`[AuthCallback][run:${runId}] resolveAuthCallbackSession start`)
        const session = await resolveAuthCallbackSession(runId)
        console.log(`[AuthCallback][run:${runId}] resolveAuthCallbackSession done`, {
          email: session?.user?.email ?? null,
          emailConfirmedAt: session?.user?.email_confirmed_at ?? null,
        })

        await logAuthSnapshot(runId, 'after-resolveAuthCallbackSession')

        const user = await resolveVerifiedUserFromSession(runId, session)
        console.log(`[AuthCallback][run:${runId}] resolveVerifiedUserFromSession done`, {
          email: user?.email ?? null,
          emailConfirmedAt: user?.email_confirmed_at ?? null,
          isEmailConfirmed: user ? isEmailConfirmed(user) : false,
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

        console.log(`[AuthCallback][run:${runId}] verification confirmed`, {
          sessionEmail,
          cancelled,
          callbackState: statusRef.current,
        })

        if (cancelled) {
          console.log(`[AuthCallback][run:${runId}] cancelled before success delay`)
          return
        }

        console.log(`[AuthCallback][run:${runId}] waiting ${SUCCESS_DISPLAY_DELAY_MS}ms before success UI`)
        await sleep(SUCCESS_DISPLAY_DELAY_MS)

        if (cancelled) {
          console.log(`[AuthCallback][run:${runId}] cancelled after success delay — skip setState`)
          return
        }

        setCallbackStatus('success', runId, 'verification-complete')
      } catch (error) {
        console.error(`[AuthCallback][run:${runId}] completeEmailVerification failed`, error)
        await logAuthSnapshot(runId, 'error')

        if (!cancelled) {
          setErrorMessage(
            error?.message ||
              '인증 메일을 다시 요청한 뒤, 회원가입을 시작한 같은 브라우저에서 최신 링크를 클릭해주세요.',
          )
          setCallbackStatus('error', runId, 'verification-failed')
        }
      }
    }

    completeEmailVerification()

    return () => {
      console.log(`[AuthCallback][run:${runId}] effect cleanup`, {
        callbackState: statusRef.current,
      })
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    console.log('[AuthCallback] render', { callbackState: status })
  }, [status])

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
