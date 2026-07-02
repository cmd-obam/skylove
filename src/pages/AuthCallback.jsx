import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { handleSignup } from '@/services/auth/signup'
import { clearSignupDraft, loadSignupDraft } from '@/utils/signupDraft'
import './Signup.css'

function getAuthParams() {
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

  return {
    code: url.searchParams.get('code'),
    type: url.searchParams.get('type') ?? hashParams.get('type'),
    tokenHash: url.searchParams.get('token_hash'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    error: url.searchParams.get('error') ?? hashParams.get('error'),
    errorDescription:
      url.searchParams.get('error_description') ?? hashParams.get('error_description'),
  }
}

async function resolveSessionFromCallback() {
  const params = getAuthParams()

  if (params.error) {
    throw new Error(params.errorDescription || '이메일 인증 처리에 실패했습니다.')
  }

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })

    if (error) {
      throw error
    }

    return data.session
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (error) {
      throw error
    }

    return data.session
  }

  if (params.tokenHash && params.type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type,
    })

    if (error) {
      throw error
    }

    return data.session
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  return session
}

function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...')

  useEffect(() => {
    let isMounted = true

    async function completeSignupFromCallback() {
      try {
        const session = await resolveSessionFromCallback()
        const user = session?.user

        if (!user?.email || !user.email_confirmed_at) {
          throw new Error('이메일 인증 상태를 확인하지 못했습니다. 인증 메일의 링크를 다시 클릭해주세요.')
        }

        const draft = loadSignupDraft()
        const draftEmail = draft?.form?.email?.trim()?.toLowerCase()
        const sessionEmail = user.email.trim().toLowerCase()

        if (!draft?.form) {
          if (!isMounted) {
            return
          }

          setStatus('success')
          setMessage('이메일 인증이 완료되었습니다. 회원가입 페이지에서 가입 완료 여부를 확인해주세요.')
          window.setTimeout(() => {
            navigate('/signup', { replace: true })
          }, 1200)
          return
        }

        if (draftEmail !== sessionEmail) {
          throw new Error('인증한 이메일과 회원가입 중인 이메일이 일치하지 않습니다.')
        }

        const result = await handleSignup(draft.form)

        if (!result.success) {
          throw new Error(result.message || '회원가입 완료 처리 중 오류가 발생했습니다.')
        }

        clearSignupDraft()

        if (!isMounted) {
          return
        }

        setStatus('success')
        setMessage('이메일 인증과 회원가입 완료 처리가 정상적으로 완료되었습니다.')
        window.setTimeout(() => {
          navigate('/signup?step=complete', { replace: true })
        }, 1000)
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

    completeSignupFromCallback()

    return () => {
      isMounted = false
    }
  }, [navigate])

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
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthCallback
