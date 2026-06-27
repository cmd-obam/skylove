export function mapProfileFetchError(error) {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()

  if (code === 'PGRST116' || message.includes('0 rows')) {
    return '회원 정보를 찾을 수 없습니다.'
  }

  if (code === '42501' || message.includes('row-level security')) {
    return '회원 정보 조회 권한이 없습니다.'
  }

  return '회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
}
