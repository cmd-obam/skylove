import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  PRAYER_CARD_CATEGORIES,
  PRAYER_CONTENT_MAX,
  PRAYER_TITLE_MAX,
  prayerCardTitle,
  prayerCategoryLabel,
} from '@/services/prayer/present'

const REQUEST_CONTENT_MAX = 1000

const CATEGORY_ICONS = {
  spirit: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M12 4v16M6 10h12" />
    </svg>
  ),
  health: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M12 19.2s-6-3.7-6-8.1A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6 3.1c0 4.4-6 8.1-6 8.1z" />
    </svg>
  ),
  identity: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M6.5 19c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4" />
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M8 8h8v11H8zM10 8V6h4v2" />
    </svg>
  ),
  family: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 11.5 12 5l8 6.5V20H4z" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </svg>
  ),
}

function PrayerForm({
  draft,
  onChange,
  onSubmit,
  submitting,
  error,
  submitLabel,
  showStatus = false,
  onBack,
  variant = 'sheet',
}) {
  const update = (patch) => onChange({ ...draft, ...patch })
  const selected = Array.isArray(draft.cardIds) ? draft.cardIds : []
  const extraOption =
    draft.category && !PRAYER_CARD_CATEGORIES.some((item) => item.id === draft.category) && selected.length === 0
      ? [{ id: draft.category, label: prayerCategoryLabel(draft.category) }]
      : []
  const cardOptions = [...extraOption, ...PRAYER_CARD_CATEGORIES]
  const onlyOther = selected.length === 1 && selected[0] === 'other'
  const composedTitle = selected.length && !onlyOther ? prayerCardTitle(selected, draft.otherText) : ''

  const toggleCard = (id) => {
    let next

    if (id === 'other') {
      next = selected.includes('other') ? [] : ['other']
    } else if (selected.includes(id)) {
      next = selected.filter((item) => item !== id)
    } else {
      next = [...selected.filter((item) => item !== 'other'), id]
    }

    update({
      cardIds: next,
      category: next[0] || '',
      otherText: next.includes('other') ? draft.otherText || '' : '',
    })
  }

  if (variant === 'request') {
    const contentCount = String(draft.content || '').length

    return (
      <form className="prayer-form prayer-form--sheet prayer-form--request" onSubmit={onSubmit}>
        <header className="prayer-request__head">
          <h1>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 16.8V20h3.2L19 8.2 15.8 5 4 16.8z" />
            </svg>
            기도 요청 작성
          </h1>
          <p>기도가 필요한 내용을 작성해 주시면, 교회가 함께 기도하겠습니다.</p>
        </header>

        <div className="prayer-request__row">
          <span className="prayer-request__label">
            이름 {!draft.isAnonymous ? <span className="prayer-field__required">*</span> : null}
          </span>
          <div className="prayer-request__name">
            <input
              value={draft.writerName || ''}
              onChange={(event) => update({ writerName: event.target.value })}
              maxLength={40}
              placeholder="이름을 입력해 주세요."
              autoComplete={AUTOCOMPLETE_OFF}
              required={!draft.isAnonymous}
            />
            <label className="prayer-request__anon">
              <input
                type="checkbox"
                checked={draft.isAnonymous}
                onChange={(event) => update({ isAnonymous: event.target.checked })}
              />
              익명으로 작성
            </label>
          </div>
        </div>

        <div className="prayer-request__row" role="group" aria-labelledby="prayer-category-label">
          <span id="prayer-category-label" className="prayer-request__label">
            기도 카테고리 <span className="prayer-field__required">*</span>
          </span>
          <div>
            <div className="prayer-request__pills">
              {cardOptions.map((item) => {
                const checked = selected.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={checked ? 'prayer-request__pill is-selected' : 'prayer-request__pill'}
                    aria-pressed={checked}
                    onClick={() => toggleCard(item.id)}
                  >
                    {CATEGORY_ICONS[item.id] || null}
                    {item.label}
                  </button>
                )
              })}
            </div>
            <p className="prayer-request__hint">여러 개를 선택할 수 있습니다.</p>
            {selected.includes('other') ? (
              <input
                className="prayer-request__other"
                value={draft.otherText || ''}
                onChange={(event) => update({ otherText: event.target.value })}
                maxLength={PRAYER_TITLE_MAX}
                placeholder="기도 제목을 작성해 주세요"
                autoComplete={AUTOCOMPLETE_OFF}
              />
            ) : null}
          </div>
        </div>

        <div className="prayer-request__row">
          <span className="prayer-request__label">
            기도 내용 <span className="prayer-field__required">*</span>
          </span>
          <div>
            <textarea
              value={draft.content}
              onChange={(event) => update({ content: event.target.value })}
              maxLength={REQUEST_CONTENT_MAX}
              rows={6}
              placeholder="함께 기도하고 싶은 내용을 자유롭게 작성해 주세요."
              autoComplete={AUTOCOMPLETE_OFF}
              required
            />
            <p className="prayer-request__count">
              {contentCount.toLocaleString('ko-KR')} / {REQUEST_CONTENT_MAX.toLocaleString('ko-KR')}자
            </p>
          </div>
        </div>

        {error ? (
          <p className="prayer-status prayer-status--error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="prayer-request__actions">
          {onBack ? (
            <button type="button" className="prayer-request__cancel" onClick={onBack} disabled={submitting}>
              취소
            </button>
          ) : null}
          <button type="submit" className="prayer-request__submit" disabled={submitting}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M3.2 11.2 20.4 3.6c.7-.3 1.4.4 1.1 1.1l-7.6 17.2c-.3.8-1.4.7-1.6-.1l-1.8-6.4-6.4-1.8c-.8-.2-.9-1.3-.1-1.6z" />
            </svg>
            {submitting ? '저장하는 중' : '기도 요청하기'}
          </button>
        </div>
      </form>
    )
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
            maxLength={PRAYER_TITLE_MAX}
            placeholder="기도 제목을 작성해 주세요"
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

      <div className="prayer-form__actions">
        {onBack ? (
          <button
            type="button"
            className="prayer-button prayer-button--ghost prayer-button--sheet"
            onClick={onBack}
            disabled={submitting}
          >
            뒤로가기
          </button>
        ) : null}
        <button type="submit" className="prayer-button prayer-button--sheet" disabled={submitting}>
          {submitting ? '저장하는 중' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default PrayerForm
