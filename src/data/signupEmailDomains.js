export const SIGNUP_EMAIL_DOMAIN_CUSTOM = '__custom__'

export const SIGNUP_EMAIL_DOMAIN_OPTIONS = [
  { value: 'naver.com', label: 'naver.com' },
  { value: 'gmail.com', label: 'gmail.com' },
  { value: 'daum.net', label: 'daum.net' },
  { value: 'hanmail.net', label: 'hanmail.net' },
  { value: 'kakao.com', label: 'kakao.com' },
  { value: 'nate.com', label: 'nate.com' },
  { value: 'outlook.com', label: 'outlook.com' },
  { value: 'icloud.com', label: 'icloud.com' },
  { value: 'hotmail.com', label: 'hotmail.com' },
  { value: SIGNUP_EMAIL_DOMAIN_CUSTOM, label: '직접 입력' },
]

export const SIGNUP_EMAIL_DOMAIN_VALUES = new Set(
  SIGNUP_EMAIL_DOMAIN_OPTIONS.map((option) => option.value).filter(
    (value) => value !== SIGNUP_EMAIL_DOMAIN_CUSTOM,
  ),
)

export const DEFAULT_SIGNUP_EMAIL_DOMAIN = 'naver.com'
