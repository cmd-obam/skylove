import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { OAUTH_PROFILE_COMPLETE_PATH } from '@/services/auth/oauthProfile'
import { supabase } from '@/lib/supabase'
import './OAuthCallback.css'

/**
 * OAuth 전용 콜백.
 * 기존 /auth/callback(이메일 인증)과 분리되어 있으며 AuthCallback 파일을 수정하지 않습니다.
 */
function OAuthCallback() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')
  const finishedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function finishOAuthLogin() {
      if (finishedRef.current) {
        return
      }

      try {
        // OAuth 전용: URL의 code로 직접 교환만 수행하고, 이메일 인증 전용 로직은 호출하지 않습니다.
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            throw error
          }

          // URL 정리 (code 제거)
          try {
            url.searchParams.delete('code')
            url.searchParams.delete('state')
            window.history.replaceState(window.history.state, '', url.pathname + url.search)
          } catch {
            // no-op
          }
        }

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        const user = currentSession?.user ?? session?.user ?? null

        if (!user) {
          if (loading) {
            return
          }

          setErrorMessage('간편 로그인 세션을 확인하지 못했습니다. 다시 시도해주세요.')
          return
        }

        const existingProfile = profile
          ? { success: true, profile }
          : await fetchProfileByUserId(user.id)

        if (cancelled || finishedRef.current) {
          return
        }

        finishedRef.current = true

        if (existingProfile.success && existingProfile.profile) {
          navigate('/', { replace: true })
          return
        }

        navigate(OAUTH_PROFILE_COMPLETE_PATH, { replace: true })
      } catch (error) {
        console.error('[OAuthCallback] finish failed', error)
        if (!cancelled) {
          setErrorMessage(
            error?.message || '간편 로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
          )
        }
      }
    }

    finishOAuthLogin()

    return () => {
      cancelled = true
    }
  }, [loading, navigate, profile, session])

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
