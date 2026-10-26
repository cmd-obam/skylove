import {
  CONGREGANT_TYPE_NEWCOMER,
  CONGREGANT_TYPE_OWN,
  OWN_CHURCH_NAME,
  getCongregantTypeLabel,
  getNewcomerStatus,
} from '@/data/congregantTypes'
import MaskedPiiField from '@/components/auth/MaskedPiiField'
import { getLoginProviderLabel } from '@/services/auth/accountLinks'
import { getRoleLabel } from '@/services/auth/roles'
import { parseReviewLabels } from '@/services/auth/memberReview'
import { formatBoardDate, formatCommentDateTime } from '@/utils/formatBoardDate'
import { PII_FIELD } from '@/utils/maskPii'

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return value
}

function formatCount(value) {
  if (value === null || value === undefined) {
    return '0'
  }

  return String(value)
}

function yesNo(value) {
  if (value === true) return '예'
  if (value === false) return '아니오'
  return '확인 불가'
}

function formatWhen(value, emptyLabel = '기록 없음') {
  if (!value) return emptyLabel
  return formatCommentDateTime(value)
}

function relatedAccountsOf(member) {
  const value = member.related_accounts
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function getAttendingChurch(member) {
  if (member.congregant_type === CONGREGANT_TYPE_OWN) {
    return OWN_CHURCH_NAME
  }

  if (member.congregant_type === CONGREGANT_TYPE_NEWCOMER) {
    return '-'
  }

  return member.attending_church || '미입력'
}

function DetailSection({ title, rows }) {
  return (
    <section className="member-detail-sections__section">
      <h3 className="member-detail-sections__heading">{title}</h3>
      <dl className="member-detail-sections__list">
        {rows.map((row) => (
          <div key={row.label} className="member-detail-sections__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function LinkedAccountsSection({
  linkedAccounts = [],
  linkedLoading = false,
  linkedError = '',
  unlinkingUserId = '',
  onUnlink,
}) {
  const secondaryAccounts = linkedAccounts.filter((account) => !account.is_primary)
  const hasLinks = secondaryAccounts.length > 0

  return (
    <section className="member-detail-sections__section">
      <h3 className="member-detail-sections__heading">연결된 계정</h3>

      {linkedLoading ? (
        <p className="member-detail-sections__status">불러오는 중...</p>
      ) : linkedError ? (
        <p className="member-detail-sections__status member-detail-sections__status--error" role="alert">
          {linkedError}
        </p>
      ) : !hasLinks ? (
        <p className="member-detail-sections__status">연결된 추가 계정이 없습니다.</p>
      ) : (
        <ol className="member-detail-sections__linked-list">
          {linkedAccounts.map((account, index) => {
            const providerLabel = getLoginProviderLabel(account.provider)
            const title = account.is_primary
              ? `${index + 1}. ${providerLabel} 로그인 (대표)`
              : `${index + 1}. ${providerLabel} 로그인`

            return (
              <li key={`${account.user_id}-${account.is_primary ? 'primary' : 'linked'}`}>
                <article className="member-detail-sections__linked-card">
                  <header className="member-detail-sections__linked-header">
                    <h4 className="member-detail-sections__linked-title">{title}</h4>
                    {!account.is_primary && typeof onUnlink === 'function' ? (
                      <button
                        type="button"
                        className="member-detail-sections__unlink-button"
                        onClick={() => onUnlink(account)}
                        disabled={Boolean(unlinkingUserId)}
                      >
                        {unlinkingUserId === account.user_id ? '해제 중...' : '연결 해제'}
                      </button>
                    ) : null}
                  </header>
                  <dl className="member-detail-sections__list">
                    <div className="member-detail-sections__row">
                      <dt>아이디</dt>
                      <dd>{displayValue(account.username)}</dd>
                    </div>
                    <div className="member-detail-sections__row">
                      <dt>이메일</dt>
                      <dd>
                        <MaskedPiiField
                          field={PII_FIELD.EMAIL}
                          value={account.email}
                          targetUserId={account.user_id}
                          targetName={account.name || ''}
                          context="detail"
                        />
                      </dd>
                    </div>
                    <div className="member-detail-sections__row">
                      <dt>가입방식</dt>
                      <dd>{providerLabel}</dd>
                    </div>
                    <div className="member-detail-sections__row">
                      <dt>가입일</dt>
                      <dd>{displayValue(formatBoardDate(account.created_at))}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function MemberDetailSections({
  member,
  linkedAccounts = [],
  linkedLoading = false,
  linkedError = '',
  unlinkingUserId = '',
  onUnlink,
}) {
  if (!member) {
    return null
  }

  const congregantLabel = getCongregantTypeLabel(member.congregant_type)
  const isNewcomer = getNewcomerStatus(member.congregant_type)
  const targetUserId = member.user_id
  const targetName = member.name || ''
  const relatedAccounts = relatedAccountsOf(member)
  const reviewLabels = parseReviewLabels(member.review_labels)
  const providers = member.auth_providers || ''
  const signupPath = member.signup_path || '확인 불가'
  const visitText = member.visit_log_available === false
    ? '접속 기록 테이블을 확인하지 못했습니다.'
    : Number(member.visit_count) > 0
      ? `${member.visit_count}건 · 최근 ${formatWhen(member.last_visit_at)}`
      : member.visit_count == null
        ? 'SQL 적용 후 확인할 수 있습니다.'
        : '연결된 접속 기록 없음'

  return (
    <div className="member-detail-sections">
      <DetailSection
        title="기본 회원정보"
        rows={[
          { label: '회원 고유 ID', value: displayValue(member.user_id) },
          { label: '이름', value: displayValue(member.name) },
          { label: '아이디', value: displayValue(member.username) },
          { label: '닉네임', value: displayValue(member.nickname) },
          {
            label: '가입 이메일',
            value: (
              <MaskedPiiField
                field={PII_FIELD.EMAIL}
                value={member.email}
                targetUserId={targetUserId}
                targetName={targetName}
                context="detail"
              />
            ),
          },
          {
            label: '이메일 인증',
            value: member.email_confirmed == null ? '확인 불가' : member.email_confirmed ? '완료' : '미완료',
          },
          { label: '회원가입 일시', value: formatWhen(member.auth_created_at || member.created_at, '확인 불가') },
          { label: '마지막 로그인', value: formatWhen(member.last_sign_in_at) },
          { label: '회원 권한', value: displayValue(getRoleLabel(member.role)) },
          { label: '회원가입 방식', value: signupPath },
          {
            label: '연락처',
            value: (
              <MaskedPiiField
                field={PII_FIELD.PHONE}
                value={member.phone}
                targetUserId={targetUserId}
                targetName={targetName}
                context="detail"
              />
            ),
          },
          { label: '생년월일', value: displayValue(member.birth_date) },
        ]}
      />

      <DetailSection
        title="교회정보"
        rows={[
          {
            label: '교인구분',
            value: congregantLabel || member.congregant_type || '미입력',
          },
          { label: '출석교회', value: getAttendingChurch(member) },
          {
            label: '새가족 여부',
            value: isNewcomer === null ? '미입력' : isNewcomer ? '예' : '아니오',
          },
        ]}
      />

      <DetailSection
        title="인증 및 계정 연결"
        rows={[
          { label: '이메일 로그인', value: yesNo(member.has_email_login) },
          { label: '카카오 로그인', value: yesNo(member.has_kakao_login) },
          { label: '연결된 인증 제공자', value: providers || '확인 불가' },
          {
            label: '추가 계정 연결',
            value: linkedAccounts.some((account) => !account.is_primary) ? '있음' : '없음',
          },
          {
            label: '비슷한 다른 프로필',
            value:
              member.similar_account_count == null
                ? 'SQL 적용 후 확인할 수 있습니다.'
                : `${member.similar_account_count}건`,
          },
        ]}
      />

      <DetailSection
        title="가입 경위"
        rows={[
          { label: '가입 경로', value: signupPath },
          {
            label: '이메일 인증 상태',
            value: member.email_confirmed == null ? '확인 불가' : member.email_confirmed ? '완료' : '미완료',
          },
          { label: '가입 시각', value: formatWhen(member.auth_created_at || member.created_at, '확인 불가') },
          { label: '마지막 로그인 시각', value: formatWhen(member.last_sign_in_at) },
          { label: '접속 기록', value: visitText },
          { label: 'IP 주소', value: '수집된 기록 없음' },
          {
            label: '조사 분류',
            value: reviewLabels.length ? reviewLabels.join(', ') : 'SQL 적용 후 확인할 수 있습니다.',
          },
        ]}
      />

      {relatedAccounts.length > 0 ? (
        <section className="member-detail-sections__section">
          <h3 className="member-detail-sections__heading">비슷한 계정</h3>
          <ul className="member-detail-sections__related">
            {relatedAccounts.map((account) => (
              <li key={account.user_id}>
                {displayValue(account.username)} · {displayValue(account.name)} · {displayValue(account.reason)}
                <span className="member-detail-sections__related-id">{account.user_id}</span>
              </li>
            ))}
          </ul>
          <p className="member-detail-sections__status">
            서로 다른 회원 고유 ID는 합치지 않습니다. 탈퇴나 삭제는 하지 않습니다.
          </p>
        </section>
      ) : null}

      <DetailSection
        title="계정정보"
        rows={[
          { label: '권한', value: displayValue(getRoleLabel(member.role)) },
          { label: '프로필 가입일', value: displayValue(formatBoardDate(member.created_at)) },
          {
            label: '최근 로그인',
            value: formatWhen(member.last_sign_in_at),
          },
        ]}
      />

      <DetailSection
        title="활동정보"
        rows={[
          { label: '작성 게시글', value: formatCount(member.posts_count) },
          { label: '작성 댓글', value: formatCount(member.comments_count) },
          { label: '받은 추천', value: formatCount(member.received_likes_count) },
          { label: '받은 신고', value: '추후 지원' },
        ]}
      />

      <LinkedAccountsSection
        linkedAccounts={linkedAccounts}
        linkedLoading={linkedLoading}
        linkedError={linkedError}
        unlinkingUserId={unlinkingUserId}
        onUnlink={onUnlink}
      />
    </div>
  )
}

export default MemberDetailSections
