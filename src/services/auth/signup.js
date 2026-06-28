import { supabase } from '@/lib/supabase'
import {
  mapSupabaseAuthError,
  mapSupabaseProfileError,
  SIGNUP_SUCCESS_MESSAGE,
} from '@/services/auth/signupErrors'

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^01[0-9]-\d{3,4}-\d{4}$/
const PASSWORD_SPECIAL_CHAR_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/
const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export { BIRTH_DATE_PATTERN }

export const BIRTH_DATE_MIN = '1900-01-01'

export function getBirthDateMax() {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeBirthDate(value) {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+)-(\d{1,2})-(\d{1,2})$/)

  if (!match) {
    return trimmed
  }

  const year = match[1].slice(0, 4)
  const month = match[2].padStart(2, '0').slice(0, 2)
  const day = match[3].padStart(2, '0').slice(0, 2)

  return `${year}-${month}-${day}`
}

export const PASSWORD_REQUIREMENT_HINT = '8자 이상, 특수문자 포함'
export const PASSWORD_PLACEHOLDER = '8자 이상, 특수문자 포함하여 입력하세요.'

export function validatePassword(password) {
  if (!password) {
    return '비밀번호를 입력해주세요.'
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상 입력해주세요.'
  }

  if (!PASSWORD_SPECIAL_CHAR_PATTERN.test(password)) {
    return '비밀번호에 특수문자를 포함해주세요.'
  }

  return null
}

export const INITIAL_SIGNUP_FORM = {
  loginId: '',
  password: '',
  passwordConfirm: '',
  name: '',
  birthDate: '',
  email: '',
  phone: '',
  agreePrivacy: false,
  agreeTerms: false,
  agreeEmail: false,
}

export function validateForm(form, { isIdChecked = false, isEmailVerified = false } = {}) {
  const errors = {}

  if (!form.loginId.trim()) {
    errors.loginId = '아이디를 입력해주세요.'
  } else if (!LOGIN_ID_PATTERN.test(form.loginId.trim())) {
    errors.loginId = '아이디는 4~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.'
  } else if (!isIdChecked) {
    errors.loginId = '아이디 중복확인을 해주세요.'
  }

  const passwordError = validatePassword(form.password)
  if (passwordError) {
    errors.password = passwordError
  }

  if (!form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
  } else if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
  }

  if (!form.name.trim()) {
    errors.name = '이름을 입력해주세요.'
  }

  if (!form.birthDate) {
    errors.birthDate = '생년월일을 선택해주세요.'
  } else if (!BIRTH_DATE_PATTERN.test(form.birthDate)) {
    errors.birthDate = '올바른 생년월일 형식을 입력해주세요.'
  }

  if (!form.email.trim()) {
    errors.email = '이메일을 입력해주세요.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = '올바른 이메일 형식을 입력해주세요.'
  }

  if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = '휴대폰 번호 형식을 확인해주세요. (예: 010-0000-0000)'
  }

  if (!form.agreePrivacy) {
    errors.agreePrivacy = '개인정보 처리방침에 동의해주세요.'
  }

  if (!form.agreeTerms) {
    errors.agreeTerms = '이용약관에 동의해주세요.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export async function checkDuplicateId(loginId) {
  // TODO: Supabase에서 아이디 중복 여부 조회
  await new Promise((resolve) => {
    window.setTimeout(resolve, 400)
  })

  return {
    available: true,
    message: '사용 가능한 아이디입니다.',
  }
}

export async function sendEmailVerification(email) {
  // TODO: Supabase Auth 이메일 인증 연동
  await new Promise((resolve) => {
    window.setTimeout(resolve, 400)
  })

  return {
    success: true,
    message: '인증 메일이 발송되었습니다. 메일함을 확인해주세요.',
  }
}

export async function handleSignup(formData) {
  const email = formData.email.trim()
  const password = formData.password

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      message: mapSupabaseAuthError(error),
    }
  }

  if (!data.user) {
    return {
      success: false,
      message: '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  const profileError = await insertProfile(data.user.id, formData)

  if (profileError) {
    return {
      success: false,
      message: mapSupabaseProfileError(profileError),
    }
  }

  return {
    success: true,
    message: SIGNUP_SUCCESS_MESSAGE,
    data: formData,
  }
}

async function insertProfile(userId, formData) {
  const phone = formData.phone.trim()

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    username: formData.loginId.trim(),
    name: formData.name.trim(),
    birthday: normalizeBirthDate(formData.birthDate),
    email: formData.email.trim(),
    phone: phone || null,
    role: 'member',
  })

  return error
}

export function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
