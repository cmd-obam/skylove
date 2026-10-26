export function parseReviewLabels(value) {
  if (!value || typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
}

export function countReviewLabels(members) {
  const counts = {
    정상: 0,
    '이메일 미인증': 0,
    '유사 계정': 0,
    '프로필 불완전': 0,
    '가입 경로 확인 불가': 0,
    '추가 조사': 0,
  }

  for (const member of members ?? []) {
    const labels = parseReviewLabels(member.review_labels)
    for (const label of labels) {
      if (label in counts) {
        counts[label] += 1
      }
    }
  }

  return counts
}

export function memberMatchesReviewFilter(member, filter) {
  if (!filter || filter === 'all') {
    return true
  }

  return parseReviewLabels(member.review_labels).includes(filter)
}
