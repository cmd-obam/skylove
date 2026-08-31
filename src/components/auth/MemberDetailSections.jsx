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

  return (
    <div className="member-detail-sections">
      <DetailSection
        title="기본정보"
        rows={[
          { label: '이름', value: displayValue(member.name) },
          { label: '아이디', value: displayValue(member.username) },
          { label: '닉네임', value: displayValue(member.nickname) },
          {
            label: '이메일',
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
        title="계정정보"
        rows={[
          { label: '권한', value: displayValue(getRoleLabel(member.role)) },
          { label: '가입일', value: displayValue(formatBoardDate(member.created_at)) },
          {
            label: '최근 로그인',
            value: member.last_sign_in_at
              ? formatCommentDateTime(member.last_sign_in_at)
              : '기록 없음',
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
