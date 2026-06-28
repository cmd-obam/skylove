import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import {
  mapProfileUpdateAuthError,
  mapProfileUpdateError,
} from '@/services/auth/profileUpdateErrors'
import {
  BIRTH_DATE_PATTERN,
  formatPhoneNumber,
  normalizeBirthDate,
  validatePassword,
} from '@/services/auth/signup'
import { setAuthSession } from '@/utils/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^01[0-9]-\d{3,4}-\d{4}$/

export const PROFILE_UPDATE_SUCCESS_MESSAGE = '회원정보가 수정되었습니다.'
export const PROFILE_EMAIL_UPDATE_SUCCESS_MESSAGE =
  '회원정보가 수정되었습니다. 이메일 변경 확인 메일을 확인해주세요.'

export function createInitialProfileForm(profile) {
  return {
    email: profile?.email ?? '',
    password: '',
    passwordConfirm: '',
    name: profile?.name ?? '',
    birthday: profile?.birthday ?? '',
    phone: profile?.phone ?? '',
  }
}

export function validateProfileUpdateForm(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = '이름을 입력해주세요.'
  }

  if (!form.birthday) {
    errors.birthday = '생년월일을 선택해주세요.'
  } else if (!BIRTH_DATE_PATTERN.test(form.birthday)) {
    errors.birthday = '올바른 생년월일 형식을 입력해주세요.'
  }

  if (!form.email.trim()) {
    errors.email = '이메일을 입력해주세요.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = '잘못된 이메일 형식입니다.'
  }

  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = '휴대폰 번호 형식을 확인해주세요. (예: 010-0000-0000)'
  }

  const isChangingPassword = Boolean(form.password || form.passwordConfirm)

  if (isChangingPassword) {
    const passwordError = validatePassword(form.password)
    if (passwordError) {
      errors.password = passwordError
    }

    if (!form.passwordConfirm) {
      errors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
    } else if (form.password !== form.passwordConfirm) {
      errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export async function handleProfileUpdate(form, currentProfile) {
  const validation = validateProfileUpdateForm(form)

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      message: '입력 정보를 확인해주세요.',
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: '로그인 정보를 확인할 수 없습니다.',
    }
  }

  const trimmedEmail = form.email.trim()
  const emailChanged = trimmedEmail !== currentProfile.email

  if (form.password) {
    const { error } = await supabase.auth.updateUser({
      password: form.password,
    })

    if (error) {
      return {
        success: false,
        message: mapProfileUpdateAuthError(error),
      }
    }
  }

  if (emailChanged) {
    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    })

    if (error) {
      return {
        success: false,
        message: mapProfileUpdateAuthError(error),
      }
    }
  }

  const phone = form.phone.trim()
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name: form.name.trim(),
      birth_date: normalizeBirthDate(form.birthday),
      phone: phone || null,
      email: trimmedEmail,
    })
    .eq('user_id', user.id)

  if (profileError) {
    return {
      success: false,
      message: mapProfileUpdateError(profileError),
    }
  }

  const profileResult = await fetchCurrentUserProfile()

  if (profileResult.success) {
    setAuthSession(profileResult.profile)
  }

  return {
    success: true,
    message: emailChanged
      ? PROFILE_EMAIL_UPDATE_SUCCESS_MESSAGE
      : PROFILE_UPDATE_SUCCESS_MESSAGE,
    profile: profileResult.success ? profileResult.profile : null,
  }
}

export { formatPhoneNumber }
