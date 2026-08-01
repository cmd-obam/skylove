import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProfileByUserId } from '@/services/auth/profile'
import {
  isSignupCompletedProfile,
  OAUTH_PROFILE_COMPLETE_PATH,
} from '@/services/auth/oauthProfile'
import { supabase } from '@/lib/supabase'
import './OAuthCallback.css'

async function waitForSessionUser({ retries = 12, delayMs = 150 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      return session.user
    }

    if (attempt < retries) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs)
      })
    }
  }

  return null
}

function clearOAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href)
    const hadParams =
      url.searchParams.has('code') ||
      url.searchParams.has('state') ||
      url.searchParams.has('error') ||
      url.searchParams.has('error_description')

    if (!hadParams) {
      return
    }

    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  } catch {
    // no-op
  }
}

/**
 * OAuth 전용 콜백.
 * 기존 /auth/callback(이메일 인증)과 분리되어 있으며 AuthCallback 파일을 수정하지 않습니다.
 */
function OAuthCallback() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const finishedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function finishOAuthLogin() {
      if (finishedRef.current) {
        return
      }

      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        let user = null

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (!error && data?.session?.user) {
            user = data.session.user
          } else if (error) {
            // code 재사용/경합이어도 이미 세션이 생겼을 수 있으므로 바로 실패 표시하지 않습니다.
            console.warn('[OAuthCallback] exchangeCodeForSession error — will probe session', {
              message: error.message,
              code: error.code,
              status: error.status,
            })
          }

          clearOAuthParamsFromUrl()
        }

        if (!user) {
          user = await waitForSessionUser()
        }

        if (cancelled) {
          return
        }

        if (!user) {
          setErrorMessage('간편 로그인 세션을 확인하지 못했습니다. 다시 시도해주세요.')
          return
        }

        // 성공 경로에서는 이전 경합으로 찍힌 실패 문구를 지우지 않도록, 에러 UI 전에 완료합니다.
        setErrorMessage('')

        const existingProfile = await fetchProfileByUserId(user.id)

        if (cancelled || finishedRef.current) {
          return
        }

        finishedRef.current = true

        if (isSignupCompletedProfile(existingProfile.success ? existingProfile.profile : null)) {
          navigate('/', { replace: true })
          return
        }

        navigate(OAUTH_PROFILE_COMPLETE_PATH, { replace: true })
      } catch (error) {
        console.error('[OAuthCallback] finish failed', error)

        if (cancelled || finishedRef.current) {
          return
        }

        // 예외가 나도 세션이 있으면 진행합니다.
        const user = await waitForSessionUser({ retries: 4, delayMs: 100 })

        if (cancelled || finishedRef.current) {
          return
        }

        if (user) {
          setErrorMessage('')
          finishedRef.current = true
          const existingProfile = await fetchProfileByUserId(user.id)

          if (isSignupCompletedProfile(existingProfile.success ? existingProfile.profile : null)) {
            navigate('/', { replace: true })
            return
          }

          navigate(OAUTH_PROFILE_COMPLETE_PATH, { replace: true })
          return
        }

        setErrorMessage(
          error?.message || '간편 로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        )
      }
    }

    finishOAuthLogin()

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (errorMessage) {
    return (
      <div className="oauth-callback-page">
        <div className="oauth-callback-page__panel" role="alert">
          <h1 className="oauth-callback-page__title">간편 로그인에 실패했습니다.</h1>
          <p className="oauth-callback-page__text">{errorMessage}</p>
          <button
            type="button"
            className="oauth-callback-page__button"
            onClick={() => navigate('/login', { replace: true })}
          >
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-page__panel" role="status" aria-live="polite">
        <div className="oauth-callback-page__spinner" aria-hidden="true" />
        <h1 className="oauth-callback-page__title">간편 로그인을 확인하고 있습니다.</h1>
        <p className="oauth-callback-page__text">잠시만 기다려 주세요...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
