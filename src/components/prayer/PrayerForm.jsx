import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  PRAYER_CATEGORIES,
  PRAYER_CONTENT_MAX,
  PRAYER_TITLE_MAX,
} from '@/services/prayer/present'

function PrayerForm({ draft, onChange, onSubmit, submitting, error, submitLabel, showStatus = false }) {
  const update = (patch) => onChange({ ...draft, ...patch })

  return (
    <form className="prayer-form" onSubmit={onSubmit}>
      <label className="prayer-field">
        <span>카테고리</span>
        <select
          value={draft.category}
          onChange={(event) => update({ category: event.target.value })}
          required
        >
          <option value="">선택</option>
          {PRAYER_CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="prayer-field">
        <span>기도 제목</span>
        <input
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={PRAYER_TITLE_MAX}
          autoComplete={AUTOCOMPLETE_OFF}
          required
        />
      </label>

      <label className="prayer-field">
        <span>기도 내용</span>
        <textarea
          value={draft.content}
          onChange={(event) => update({ content: event.target.value })}
          maxLength={PRAYER_CONTENT_MAX}
          rows={8}
          autoComplete={AUTOCOMPLETE_OFF}
          required
        />
      </label>

      {showStatus ? (
        <fieldset className="prayer-field">
          <legend>기도 상태</legend>
          <label className="prayer-choice">
            <input
              type="radio"
              name="prayer-status"
              checked={draft.status === 'praying'}
              onChange={() => update({ status: 'praying' })}
            />
            기도 중
          </label>
          <label className="prayer-choice">
            <input
              type="radio"
              name="prayer-status"
              checked={draft.status === 'answered'}
              onChange={() => update({ status: 'answered' })}
            />
            응답 완료
          </label>
        </fieldset>
      ) : null}

      <label className="prayer-choice">
        <input
          type="checkbox"
          checked={draft.isAnonymous}
          onChange={(event) => update({ isAnonymous: event.target.checked })}
        />
        익명으로 작성
      </label>
      <p className="prayer-form__help">
        다른 회원에게는 작성자가 보이지 않습니다.
      </p>

      <fieldset className="prayer-field">
        <legend>공개 범위</legend>
        <label className="prayer-choice">
          <input
            type="radio"
            name="prayer-visibility"
            checked={draft.visibility === 'public'}
            onChange={() => update({ visibility: 'public' })}
          />
          회원 공개
        </label>
        <p className="prayer-form__help">로그인한 회원이 바로 볼 수 있고, 함께 기도할 수 있습니다.</p>
        <label className="prayer-choice">
          <input
            type="radio"
            name="prayer-visibility"
            checked={draft.visibility === 'private'}
            onChange={() => update({ visibility: 'private' })}
          />
          비공개
        </label>
        <p className="prayer-form__help">
          비공개로 전달됩니다. 일반 회원은 작성자 본인이라도 이 글을 다시 열 수 없습니다.
        </p>
      </fieldset>

      {error ? (
        <p className="prayer-status prayer-status--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="prayer-button" disabled={submitting}>
        {submitting ? '저장하는 중' : submitLabel}
      </button>
    </form>
  )
}

export default PrayerForm
