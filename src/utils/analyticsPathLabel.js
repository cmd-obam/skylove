import { PAGE_META } from '@/data/pageMeta'

/** Exact path → 표시 이름 (통계/관리자 화면용) */
const EXACT_PATH_LABELS = {
  '/': '홈',
  '/login': '로그인',
  '/signup': '회원가입',
  '/oauth/complete': '소셜 가입 추가정보',
  '/auth/callback': '로그인 처리',
  '/auth/oauth-callback': '소셜 로그인 처리',
  '/auth/confirm': '이메일 인증 완료',
  '/email-confirm': '이메일 인증 완료',
  '/reset-password': '비밀번호 재설정',
  '/reset-password/security-question': '비밀번호 재설정 (보안질문)',
  '/reset-password/email-verify': '비밀번호 재설정 (이메일)',
  '/member/edit': '내 정보',
  '/mypage/change-password': '비밀번호 변경',
  '/member/management': '회원관리',
  '/member/content-management': '게시글 & 댓글 관리',
  '/member/visitor-stats': '방문자통계',
  '/admin': '관리자',
  '/about': '담임목사 인사',
  '/about/people': '섬기는 사람들',
  '/about/people/clergy': '직분자',
  '/about/people/ministers': '사역자',
  '/about/history': '교회역사',
  '/about/facilities': '교회시설 안내',
  '/about/facility-vr': 'VR 둘러보기',
  '/about/location': '찾아오시는 길',
  '/worship': '예배시간 안내',
  '/worship-guide': '예배안내',
  '/worship-guide/sunday-blessing': '주일 축복 예배',
  '/worship-guide/sunday-blessing/communion': '성찬식',
  '/worship-guide/sunday-praise': '주일 찬양 예배',
  '/worship-guide/wednesday': '수요예배',
  '/worship-guide/dawn-prayer': '새벽기도',
  '/worship-guide/el-shaddai-choir': '엘샤다이 찬양단 안내',
  '/worship-guide/cell-meeting': '셀모임',
  '/worship-word': '예배말씀',
  '/worship-word/sunday': '주일예배 말씀',
  '/worship-word/el-shaddai': '엘샤다이 찬양단 말씀',
  '/worship-word/sunday/write': '주일예배 등록',
  '/worship-word/el-shaddai/write': '엘샤다이 찬양단 등록',
  '/church-news': '교회소식',
  '/church-news/pastor-story': '담임목사 이야기',
  '/church-news/album': '교회앨범',
  '/news/write': '교회소식 글쓰기',
  '/pastor-story/write': '담임목사 이야기 글쓰기',
  '/album/write': '교회앨범 등록',
  '/new-family': '새가족 안내',
  '/education': '교육&양육',
  '/mission': '전도&선교',
  '/fellowship': '나눔&교제',
}

const DYNAMIC_PATH_RULES = [
  { pattern: /^\/member\/management\/[^/]+$/i, label: '회원 상세' },
  { pattern: /^\/worship-word\/sunday\/edit\/[^/]+$/i, label: '주일예배 수정' },
  { pattern: /^\/worship-word\/el-shaddai\/edit\/[^/]+$/i, label: '엘샤다이 찬양단 수정' },
  { pattern: /^\/worship-word\/sunday\/[^/]+$/i, label: '주일예배 상세' },
  { pattern: /^\/worship-word\/el-shaddai\/[^/]+$/i, label: '엘샤다이 찬양단 상세' },
  { pattern: /^\/news\/edit\/[^/]+$/i, label: '교회소식 수정' },
  { pattern: /^\/pastor-story\/edit\/[^/]+$/i, label: '담임목사 이야기 수정' },
  { pattern: /^\/album\/edit\/[^/]+$/i, label: '교회앨범 수정' },
  { pattern: /^\/church-news\/pastor-story\/[^/]+$/i, label: '담임목사 이야기 상세' },
  { pattern: /^\/church-news\/album\/[^/]+$/i, label: '교회앨범 상세' },
  { pattern: /^\/church-news\/[^/]+$/i, label: '교회소식 상세' },
]

function normalizePath(rawPath) {
  if (!rawPath) return ''
  try {
    const value = String(rawPath).trim()
    if (!value) return ''
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return new URL(value).pathname || '/'
    }
    const withoutHash = value.split('#')[0]
    const pathname = withoutHash.split('?')[0] || '/'
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return pathname.slice(0, -1)
    }
    return pathname || '/'
  } catch {
    return String(rawPath).trim()
  }
}

/**
 * 통계에 표시할 경로를 사람이 읽기 쉬운 페이지 이름으로 변환한다.
 * 예: /member/visitor-stats → 방문자통계
 */
export function getAnalyticsPathLabel(rawPath) {
  const path = normalizePath(rawPath)
  if (!path) return '-'

  if (EXACT_PATH_LABELS[path]) {
    return EXACT_PATH_LABELS[path]
  }

  const metaTitle = PAGE_META[path]?.title
  if (metaTitle && metaTitle !== '페이지') {
    return metaTitle
  }

  for (const rule of DYNAMIC_PATH_RULES) {
    if (rule.pattern.test(path)) {
      return rule.label
    }
  }

  return path
}
