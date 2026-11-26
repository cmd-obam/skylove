import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  PRAYER_CARD_CATEGORIES,
  PRAYER_CONTENT_MAX,
  PRAYER_TITLE_MAX,
  prayerCategoryLabel,
} from '@/services/prayer/present'

function PrayerForm({
  draft,
  onChange,
  onSubmit,
  submitting,
  error,
  submitLabel,
  showStatus = false,
}) {
  const update = (patch) => onChange({ ...draft, ...patch })
  const cardOptions = PRAYER_CARD_CATEGORIES.some((item) => item.id === draft.category)
    ? PRAYER_CARD_CATEGORIES
    : draft.category
      ? [{ id: draft.category, label: prayerCategoryLabel(draft.category) }, ...PRAYER_CARD_CATEGORIES]
      : PRAYER_CARD_CATEGORIES

  return (
    <form className="prayer-form prayer-form--sheet" onSubmit={onSubmit}>
      <label className="prayer-field">
        <span>
          제목 <span className="prayer-field__required">*</span>
        </span>
        <input
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={PRAYER_TITLE_MAX}
          placeholder="제목을 입력해 주세요"
          autoComplete={AUTOCOMPLETE_OFF}
          required
        />
      </label>

      <fieldset className="prayer-field">
        <legend>
          기도카드분류 <span className="prayer-field__required">*</span>
        </legend>
        <div className="prayer-card-types">
          {cardOptions.map((item) => (
            <label key={item.id} className="prayer-card-types__item">
              <input
                type="checkbox"
                checked={draft.category === item.id}
                onChange={() => update({ category: item.id })}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="prayer-field">
        <span>
          기도 내용 <span className="prayer-field__required">*</span>
        </span>
        <textarea
          value={draft.content}
          onChange={(event) => update({ content: event.target.value })}
          maxLength={PRAYER_CONTENT_MAX}
          rows={8}
          placeholder="함께 나누고 싶은 기도 내용을 자유롭게 작성해 주세요."
          autoComplete={AUTOCOMPLETE_OFF}
          required
        />
      </label>
      <p className="prayer-form__help">기도 내용을 편하게 작성해 주세요.</p>

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
          작성자와 담임목사만 볼 수 있습니다.
        </p>
      </fieldset>

      {error ? (
        <p className="prayer-status prayer-status--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="prayer-button prayer-button--sheet" disabled={submitting}>
        {submitting ? '저장하는 중' : submitLabel}
      </button>
    </form>
  )
}

export default PrayerForm
