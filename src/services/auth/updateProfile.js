import { supabase } from '@/lib/supabase'
import { fetchCurrentUserProfile } from '@/services/auth/profile'
import {
  mapProfileUpdateAuthError,
  mapProfileUpdateError,
} from '@/services/auth/profileUpdateErrors'
import {
  BIRTH_DATE_PATTERN,
  checkDuplicateNickname,
  formatPhoneNumber,
  normalizeBirthDate,
  validatePassword,
} from '@/services/auth/signup'
import {
  CONGREGANT_TYPE_IDS,
  isOtherCongregantType,
  normalizeChurchInformation,
} from '@/data/congregantTypes'
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
    nickname: profile?.nickname ?? '',
    nicknameEnabled: Boolean(profile?.nicknameEnabled),
    birthday: profile?.birthday ?? '',
    phone: profile?.phone ?? '',
    congregantType: profile?.congregantType ?? '',
    attendingChurch: profile?.attendingChurch ?? '',
  }
}

export function validateProfileUpdateForm(form, { isNicknameChecked = false } = {}) {
  const errors = {}
  const nickname = String(form.nickname ?? '').trim()

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

  if (!CONGREGANT_TYPE_IDS.has(form.congregantType)) {
    errors.congregantType = '교인 구분을 선택해주세요.'
  } else if (
    isOtherCongregantType(form.congregantType) &&
    !form.attendingChurch.trim()
  ) {
    errors.congregantType = '출석 교회를 입력해주세요.'
  }

  if (nickname) {
    if (nickname.length < 2 || nickname.length > 20) {
      errors.nickname = '닉네임은 2~20자로 입력해주세요.'
    } else if (!isNicknameChecked) {
      errors.nickname = '닉네임 중복확인을 해주세요.'
    }
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

export async function handleProfileUpdate(form, currentProfile, { isNicknameChecked = false } = {}) {
  const nickname = String(form.nickname ?? '').trim()
  const originalNickname = String(currentProfile?.nickname ?? '').trim()
  const nicknameUnchanged = nickname.toLowerCase() === originalNickname.toLowerCase()

  // 본인 닉네임을 그대로 두면 중복확인 생략
  const nicknameCheckOk = !nickname || nicknameUnchanged || isNicknameChecked

  const validation = validateProfileUpdateForm(form, {
    isNicknameChecked: nicknameCheckOk,
  })

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      message: '입력 정보를 확인해주세요.',
    }
  }

  if (nickname && !nicknameUnchanged) {
    const dup = await checkDuplicateNickname(nickname, {
      excludeUserId: currentProfile?.effectiveUserId || null,
    })

    if (!dup.available) {
      return {
        success: false,
        errors: { nickname: dup.message },
        message: dup.message,
      }
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
  const churchInformation = normalizeChurchInformation(
    form.congregantType,
    form.attendingChurch,
  )
  const { congregantType, attendingChurch } = churchInformation
  const nicknameEnabled = Boolean(nickname && form.nicknameEnabled)

  const updatePayload = {
    // name은 가입 후 변경 불가 — 의도적으로 제외
    birth_date: normalizeBirthDate(form.birthday),
    phone: phone || null,
    email: trimmedEmail,
    congregant_type: congregantType,
    attending_church: attendingChurch,
    nickname: nickname || null,
    nickname_enabled: nicknameEnabled,
  }

  let { data: savedProfile, error: profileError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', user.id)
    .select('congregant_type,attending_church,nickname,nickname_enabled')
    .single()

  if (profileError && /nickname|42703|PGRST204|schema cache/i.test(
    `${profileError.code || ''} ${profileError.message || ''}`,
  )) {
    const {
      nickname: _n,
      nickname_enabled: _e,
      ...withoutNickname
    } = updatePayload

    ;({ data: savedProfile, error: profileError } = await supabase
      .from('profiles')
      .update(withoutNickname)
      .eq('user_id', user.id)
      .select('congregant_type,attending_church')
      .single())
  }

  if (profileError) {
    if (
      profileError.code === '23505' ||
      /nickname|unique|duplicate/i.test(profileError.message || '')
    ) {
      return {
        success: false,
        errors: {
          nickname: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.',
        },
        message: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.',
      }
    }

    if (/이름은 가입 후 변경할 수 없습니다/i.test(profileError.message || '')) {
      return {
        success: false,
        message: '이름은 가입 후 변경할 수 없습니다.',
      }
    }

    return {
      success: false,
      message: mapProfileUpdateError(profileError),
    }
  }

  if (
    savedProfile.congregant_type !== congregantType ||
    savedProfile.attending_church !== attendingChurch
  ) {
    return {
      success: false,
      message: '교인정보가 저장되지 않았습니다. 잠시 후 다시 시도해주세요.',
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
