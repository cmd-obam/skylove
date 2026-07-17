import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiLock, FiCalendar, FiMail, FiSmartphone } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import DeleteAccountModal from '@/components/auth/DeleteAccountModal'
import UnlinkKakaoModal from '@/components/auth/UnlinkKakaoModal'
import '@/components/auth/DeleteAccountModal.css'
import { deleteAccount } from '@/services/auth/deleteAccount'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import { canDeleteAccount, getSelfDeleteBlockMessage } from '@/services/auth/roles'
import {
  getAccountLoginMethods,
  unlinkKakaoIdentity,
} from '@/services/auth/unlinkKakao'
import {
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIREMENT_HINT,
} from '@/services/auth/signup'
import {
  createInitialProfileForm,
  formatPhoneNumber,
  handleProfileUpdate,
} from '@/services/auth/updateProfile'
import { BIRTH_DATE_MIN, getBirthDateMax, normalizeBirthDate } from '@/services/auth/signup'
import { AUTOCOMPLETE_OFF, PASSWORD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import MemberMypageLayout from '@/components/auth/MemberMypageLayout'
import { useAuth } from '@/contexts/AuthContext'
import { setAuthSession } from '@/utils/auth'
import './Signup.css'
import './MemberEdit.css'

function ProfileFieldCard({ icon: Icon, label, optional = false, error, hint, hintId, children }) {
  return (
    <div className={`signup-field-card${error ? ' signup-field-card--error' : ''}`}>
      <div className="signup-field-card__header">
        <Icon className="signup-field-card__icon" aria-hidden="true" />
        <span className="signup-field-card__label">{label}</span>
        {optional && <span className="signup-field-card__optional">(선택)</span>}
      </div>
      <div className="signup-field-card__body">{children}</div>
      {hint && !error && (
        <p id={hintId} className="signup-field-card__hint">
          {hint}
        </p>
      )}
      {error && (
        <p className="signup-field-card__message signup-field-card__message--error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function MemberEdit() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [form, setForm] = useState(createInitialProfileForm())
  const [currentProfile, setCurrentProfile] = useState(null)
  const [errors, setErrors] = useState({})
  const [formFeedback, setFormFeedback] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteComplete, setDeleteComplete] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [loginMethodLabel, setLoginMethodLabel] = useState('확인 중...')
  const [hasKakaoIdentity, setHasKakaoIdentity] = useState(false)
  const [canUnlinkKakao, setCanUnlinkKakao] = useState(false)
  const [otherLoginMethods, setOtherLoginMethods] = useState([])
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false)
  const [isUnlinkingKakao, setIsUnlinkingKakao] = useState(false)
  const [unlinkError, setUnlinkError] = useState(null)
  const [accountFeedback, setAccountFeedback] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      const [result, loginMethods] = await Promise.all([
        fetchCurrentUserProfile(),
        getAccountLoginMethods(),
      ])

      if (!isMounted) {
        return
      }

      if (!result.success) {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
        setIsLoading(false)
        return
      }

      setCurrentProfile(result.profile)
      setForm(createInitialProfileForm(result.profile))
      setAuthSession(result.profile)
      setLoginMethodLabel(loginMethods.primaryLabel || '알 수 없음')
      setHasKakaoIdentity(Boolean(loginMethods.hasKakao))
      setCanUnlinkKakao(Boolean(loginMethods.canUnlinkKakao))
      setOtherLoginMethods(loginMethods.otherLoginMethods || [])
      setIsLoading(false)
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (!deleteComplete) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [deleteComplete, navigate])

  const canShowDeleteAccount = canDeleteAccount(currentProfile)
  const selfDeleteBlockMessage = getSelfDeleteBlockMessage(currentProfile?.role)

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    setDeleteError(null)

    const result = await deleteAccount()

    if (!result.success) {
      setDeleteError(result.message)
      setIsDeletingAccount(false)
      return
    }

    setIsDeleteModalOpen(false)
    setDeleteComplete(true)
    setIsDeletingAccount(false)
  }

  const handleUnlinkKakao = async () => {
    setIsUnlinkingKakao(true)
    setUnlinkError(null)
    setAccountFeedback(null)

    try {
      const result = await unlinkKakaoIdentity()

      if (!result.success) {
        setUnlinkError(result.message)
        setAccountFeedback({
          type: 'error',
          message: result.message,
        })
        setIsUnlinkingKakao(false)
        return
      }

      setHasKakaoIdentity(false)
      setCanUnlinkKakao(false)
      setLoginMethodLabel(
        result.remainingMethods?.[0] || otherLoginMethods[0] || '이메일 로그인',
      )
      setAccountFeedback({
        type: 'success',
        message: result.message || '카카오 계정 연동이 해제되었습니다.',
      })
      setIsUnlinkModalOpen(false)
      setIsUnlinkingKakao(false)

      window.setTimeout(async () => {
        try {
          await signOut()
        } catch {
          // ignore — still move to login
        }
        navigate('/login', { replace: true })
      }, 1500)
    } catch (error) {
      console.error('[MemberEdit] handleUnlinkKakao unexpected', error)
      const message =
        error?.message || '카카오 계정 연동 해제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      setUnlinkError(message)
      setAccountFeedback({ type: 'error', message })
      setIsUnlinkingKakao(false)
    }
  }

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    setFormFeedback(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    if (!currentProfile) {
      return
    }

    setIsSubmitting(true)
    setFormFeedback(null)

    try {
      const result = await handleProfileUpdate(form, currentProfile)

      if (result.errors) {
        setErrors(result.errors)
      }

      if (result.success) {
        if (result.profile) {
          setCurrentProfile(result.profile)
          setForm(createInitialProfileForm(result.profile))
        }

        setFormFeedback({
          type: 'success',
          message: result.message,
        })
      } else {
        setFormFeedback({
          type: 'error',
          message: result.message,
        })
      }
    } catch {
      setFormFeedback({
        type: 'error',
        message: '회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (deleteComplete) {
    return (
      <div className="member-delete-complete" role="status" aria-live="polite">
        <p className="member-delete-complete__toast">회원탈퇴가 완료되었습니다.</p>
        <p className="member-delete-complete__thanks">
          그동안 하늘사랑교회를 이용해주셔서 감사합니다.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <MemberMypageLayout>
        <div className="signup-page">
          <div className="signup-page__container">
            <section className="signup-card" aria-label="회원정보 수정">
              <p>회원정보를 불러오는 중입니다.</p>
            </section>
          </div>
        </div>
      </MemberMypageLayout>
    )
  }

  return (
    <MemberMypageLayout>
    <div className="signup-page">
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingAccount}
        error={deleteError}
        onCancel={() => {
          if (!isDeletingAccount) {
            setIsDeleteModalOpen(false)
            setDeleteError(null)
          }
        }}
        onConfirm={handleDeleteAccount}
      />

      <UnlinkKakaoModal
        isOpen={isUnlinkModalOpen}
        isUnlinking={isUnlinkingKakao}
        error={unlinkError}
        otherLoginMethods={otherLoginMethods}
        onCancel={() => {
          if (!isUnlinkingKakao) {
            setIsUnlinkModalOpen(false)
            setUnlinkError(null)
          }
        }}
        onConfirm={handleUnlinkKakao}
      />

      <div className="signup-page__container">
        <section className="signup-card" aria-label="회원정보 수정">
          <header className="signup-card__header">
            <h1 className="signup-card__title">회원정보 수정</h1>
            <div className="signup-card__accent" aria-hidden="true" />
            <p className="signup-card__description">
              비밀번호, 이름, 생년월일, 휴대폰, 이메일 정보를 수정할 수 있습니다.
            </p>
          </header>

          <form className="signup-form" onSubmit={onSubmit} noValidate autoComplete="off">
            <div className="signup-form__fields">
              <ProfileFieldCard icon={FiMail} label="이메일" error={errors.email}>
                <input
                  id="member-edit-email"
                  name="email"
                  type="email"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </ProfileFieldCard>

              <ProfileFieldCard
                icon={FiLock}
                label="비밀번호"
                optional
                error={errors.password}
                hint={PASSWORD_REQUIREMENT_HINT}
                hintId="member-edit-password-hint"
              >
                <input
                  id="member-edit-password"
                  name="password"
                  type="password"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder={PASSWORD_PLACEHOLDER}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  autoComplete={PASSWORD_AUTOCOMPLETE_OFF}
                  aria-describedby="member-edit-password-hint"
                />
              </ProfileFieldCard>

              <ProfileFieldCard
                icon={FiLock}
                label="비밀번호 확인"
                optional
                error={errors.passwordConfirm}
              >
                <input
                  id="member-edit-password-confirm"
                  name="passwordConfirm"
                  type="password"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="변경 시에만 입력하세요."
                  value={form.passwordConfirm}
                  onChange={(event) => updateField('passwordConfirm', event.target.value)}
                  autoComplete={PASSWORD_AUTOCOMPLETE_OFF}
                />
              </ProfileFieldCard>

              <ProfileFieldCard icon={FiUser} label="이름" error={errors.name}>
                <input
                  id="member-edit-name"
                  name="name"
                  type="text"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="이름을 입력하세요."
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </ProfileFieldCard>

              <ProfileFieldCard icon={FiCalendar} label="생년월일" error={errors.birthday}>
                <input
                  id="member-edit-birthday"
                  name="birthday"
                  type="date"
                  className="signup-field-card__input signup-field-card__input--full signup-field-card__input--date"
                  value={form.birthday}
                  onChange={(event) => updateField('birthday', normalizeBirthDate(event.target.value))}
                  min={BIRTH_DATE_MIN}
                  max={getBirthDateMax()}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </ProfileFieldCard>

              <ProfileFieldCard
                icon={FiSmartphone}
                label="휴대폰 번호"
                optional
                error={errors.phone}
              >
                <input
                  id="member-edit-phone"
                  name="phone"
                  type="tel"
                  className="signup-field-card__input signup-field-card__input--full"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
                  autoComplete={AUTOCOMPLETE_OFF}
                />
              </ProfileFieldCard>
            </div>

            {formFeedback && (
              <p
                className={`signup-form__feedback signup-form__feedback--${formFeedback.type}`}
                role={formFeedback.type === 'error' ? 'alert' : 'status'}
              >
                {formFeedback.message}
              </p>
            )}

            <div className="signup-form__actions">
              <div className="signup-form__actions-row">
                <button type="submit" className="signup-btn signup-btn--primary" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '회원정보 수정'}
                </button>

                {canShowDeleteAccount && (
                  <button
                    type="button"
                    className="signup-btn signup-btn--danger"
                    onClick={() => {
                      setDeleteError(null)
                      setIsDeleteModalOpen(true)
                    }}
                    disabled={isSubmitting || isDeletingAccount || isUnlinkingKakao}
                  >
                    회원탈퇴
                  </button>
                )}
              </div>

              {selfDeleteBlockMessage && (
                <p className="signup-form__login" role="status">
                  {selfDeleteBlockMessage}
                </p>
              )}

              <p className="signup-form__login">
                <Link to="/" className="signup-form__login-link">
                  메인으로 돌아가기
                </Link>
              </p>
            </div>
          </form>

          <section className="member-account-section" aria-label="계정 관리">
            <h2 className="member-account-section__title">계정 관리</h2>
            <div className="member-account-section__row">
              <span className="member-account-section__label">로그인 방식 :</span>
              <span className="member-account-section__value">{loginMethodLabel}</span>
            </div>

            {accountFeedback && (
              <p
                className={`signup-form__feedback signup-form__feedback--${accountFeedback.type}`}
                role={accountFeedback.type === 'error' ? 'alert' : 'status'}
              >
                {accountFeedback.message}
              </p>
            )}

            {hasKakaoIdentity ? (
              <div className="member-account-section__actions">
                <button
                  type="button"
                  className="signup-btn signup-btn--danger"
                  onClick={() => {
                    setUnlinkError(null)
                    setAccountFeedback(null)
                    setIsUnlinkModalOpen(true)
                  }}
                  disabled={
                    isSubmitting || isDeletingAccount || isUnlinkingKakao || !canUnlinkKakao
                  }
                >
                  카카오 계정 연동 해제
                </button>
                {canUnlinkKakao ? (
                  <p className="member-account-section__hint">
                    연동 해제 후에도 회원 정보는 유지됩니다. 다른 로그인 수단(
                    {otherLoginMethods.join(', ') || '이메일 등'}
                    )으로 계속 이용할 수 있습니다.
                  </p>
                ) : (
                  <p className="member-account-section__hint" role="status">
                    현재 로그인 수단이 카카오뿐이라 연동을 해제할 수 없습니다. 이메일 등 다른
                    로그인 수단을 추가한 뒤 다시 시도해주세요.
                  </p>
                )}
              </div>
            ) : (
              <p className="member-account-section__hint">연동된 카카오 계정이 없습니다.</p>
            )}
          </section>
        </section>
      </div>
    </div>
    </MemberMypageLayout>
  )
}

export default MemberEdit
