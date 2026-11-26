import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  PRAYER_CARD_CATEGORIES,
  PRAYER_CONTENT_MAX,
  prayerCardTitle,
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
  const selected = Array.isArray(draft.cardIds) ? draft.cardIds : []
  const extraOption =
    draft.category && !PRAYER_CARD_CATEGORIES.some((item) => item.id === draft.category) && selected.length === 0
      ? [{ id: draft.category, label: prayerCategoryLabel(draft.category) }]
      : []
  const cardOptions = [...extraOption, ...PRAYER_CARD_CATEGORIES]
  const composedTitle = selected.length ? prayerCardTitle(selected, draft.otherText) : ''

  const toggleCard = (id) => {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
    update({
      cardIds: next,
      category: next[0] || '',
      otherText: next.includes('other') ? draft.otherText || '' : '',
    })
  }

  return (
    <form className="prayer-form prayer-form--sheet" onSubmit={onSubmit}>
      <label className="prayer-field">
        <span>
          이름 {!draft.isAnonymous ? <span className="prayer-field__required">*</span> : null}
        </span>
        <input
          value={draft.writerName || ''}
          onChange={(event) => update({ writerName: event.target.value })}
          maxLength={40}
          placeholder="이름을 입력해 주세요"
          autoComplete={AUTOCOMPLETE_OFF}
          required={!draft.isAnonymous}
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
                checked={selected.includes(item.id)}
                onChange={() => toggleCard(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
        {selected.includes('other') ? (
          <input
            value={draft.otherText || ''}
            onChange={(event) => update({ otherText: event.target.value })}
            maxLength={40}
            placeholder="기타 내용을 입력해 주세요"
            autoComplete={AUTOCOMPLETE_OFF}
          />
        ) : null}
        {composedTitle ? <p className="prayer-form__author">{composedTitle}</p> : null}
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
