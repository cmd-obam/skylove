import { useEffect, useState } from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import {
  isEmailConfirmed,
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

async function waitForConfirmedUser(initialUser, maxAttempts = 6) {
  let user = initialUser

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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

    await new Promise((resolve) => {
      window.setTimeout(resolve, 350)
    })
  }

  return user
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

function AuthCallbackError() {
  return (
    <div className="auth-callback-page__panel" role="alert">
      <div className="auth-callback-page__icon auth-callback-page__icon--error" aria-hidden="true">
        <FiAlertCircle />
      </div>
      <h1 className="auth-callback-page__title">이메일 인증에 실패했습니다.</h1>
      <p className="auth-callback-page__text">인증 메일을 다시 요청해주세요.</p>
    </div>
  )
}

async function resolveVerifiedUserFromSession(initialSession) {
  let user = initialSession?.user ?? null

  if (user?.email && isEmailConfirmed(user)) {
    return user
  }

  await syncSupabaseAuthSession({ retries: 10, retryDelayMs: 300 })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user) {
    user = session.user
  }

  return waitForConfirmedUser(user)
}

function AuthCallback() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    let successTimer = null

    async function completeEmailVerification() {
      try {
        const session = await resolveAuthCallbackSession()
        const user = await resolveVerifiedUserFromSession(session)

        if (!user?.email) {
          throw new Error('이메일 인증 정보를 확인하지 못했습니다.')
        }

        if (!isEmailConfirmed(user)) {
          throw new Error('이메일 인증 상태를 확인하지 못했습니다.')
        }

        const sessionEmail = user.email.trim().toLowerCase()

        setEmailVerifiedBeacon(sessionEmail)
        broadcastEmailVerified(sessionEmail)

        if (cancelled) {
          return
        }

        await new Promise((resolve) => {
          successTimer = window.setTimeout(resolve, SUCCESS_DISPLAY_DELAY_MS)
        })

        if (cancelled) {
          return
        }

        setStatus('success')
      } catch (error) {
        console.error('[AuthCallback] 이메일 인증 콜백 처리 실패', error)

        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    completeEmailVerification()

    return () => {
      cancelled = true

      if (successTimer) {
        window.clearTimeout(successTimer)
      }
    }
  }, [])

  const handleClose = () => {
    window.close()
  }

  return (
    <div className="auth-callback-page">
      <section className="auth-callback-page__card" aria-label="이메일 인증 처리">
        {status === 'loading' && <AuthCallbackLoading />}
        {status === 'success' && <AuthCallbackSuccess onClose={handleClose} />}
        {status === 'error' && <AuthCallbackError />}
      </section>
    </div>
  )
}

export default AuthCallback
