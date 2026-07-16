/** PKCE code_verifier가 없는 환경(다른 브라우저/기기)에서 메일 링크를 연 경우 */
export const AUTH_CROSS_BROWSER_MESSAGE =
  '다른 브라우저에서는 인증을 완료할 수 없습니다.'

export const AUTH_CROSS_BROWSER_HINT =
  '회원가입을 진행 중인 같은 Chrome(같은 프로필)에서 최신 인증 메일의 링크를 열어주세요.\n또는 회원가입 화면에 표시된 6자리 인증번호를 입력해주세요.'

export function isMissingPkceVerifierError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()
  const code = String(error?.code ?? '').toLowerCase()
  const name = String(error?.name ?? '').toLowerCase()

  return (
    code === 'pkce_code_verifier_not_found' ||
    name.includes('pkcecodeverifier') ||
    message.includes('pkce code verifier not found') ||
    message.includes('code verifier') ||
    message.includes('both auth code and code verifier') ||
    (message.includes('pkce') && message.includes('verifier'))
  )
}

export function toAuthCallbackUserMessage(error) {
  if (!error) {
    return '회원가입 페이지에서 인증 메일을 다시 요청한 뒤, 최신 링크를 클릭해주세요.'
  }

  if (
    error?.code === 'AUTH_CROSS_BROWSER' ||
    error?.message === AUTH_CROSS_BROWSER_MESSAGE ||
    isMissingPkceVerifierError(error)
  ) {
    return `${AUTH_CROSS_BROWSER_MESSAGE}\n\n${AUTH_CROSS_BROWSER_HINT}`
  }

  return (
    error?.message ||
    '회원가입 페이지에서 인증 메일을 다시 요청한 뒤, 최신 링크를 클릭해주세요.'
  )
}
