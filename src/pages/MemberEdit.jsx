import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiLock, FiCalendar, FiMail, FiSmartphone } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import DeleteAccountModal from '@/components/auth/DeleteAccountModal'
import '@/components/auth/DeleteAccountModal.css'
import { deleteAccount } from '@/services/auth/deleteAccount'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
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
import { setAuthSession } from '@/utils/auth'
import './Signup.css'

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

      const result = await fetchCurrentUserProfile()

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

                <button
                  type="button"
                  className="signup-btn signup-btn--danger"
                  onClick={() => {
                    setDeleteError(null)
                    setIsDeleteModalOpen(true)
                  }}
                  disabled={isSubmitting || isDeletingAccount}
                >
                  회원탈퇴
                </button>
              </div>

              <p className="signup-form__login">
                <Link to="/" className="signup-form__login-link">
                  메인으로 돌아가기
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
    </MemberMypageLayout>
  )
}

export default MemberEdit
