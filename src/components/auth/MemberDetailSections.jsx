import {
  CONGREGANT_TYPE_NEWCOMER,
  CONGREGANT_TYPE_OWN,
  OWN_CHURCH_NAME,
  getCongregantTypeLabel,
  getNewcomerStatus,
} from '@/data/congregantTypes'
import MaskedPiiField from '@/components/auth/MaskedPiiField'
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

export function MemberDetailSections({ member }) {
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
    </div>
  )
}

export default MemberDetailSections
