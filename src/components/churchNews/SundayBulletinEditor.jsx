import SundayBulletin from '@/components/churchNews/SundayBulletin'
import {
  SUNDAY_BULLETIN_LOCKABLE_FIELDS,
  SUNDAY_BULLETIN_WEEKLY_FIELDS,
} from '@/data/sundayBulletinFixed'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  createEmptySundayBulletinWeekly,
  extractSeasonWeekNumber,
  getBulletinFieldDefault,
  isBulletinFieldLocked,
} from '@/utils/sundayBulletin'
import './SundayBulletinForm.css'

function SundayBulletinEditor({ weekly, onChange, disabled = false, showPreview = true }) {
  const data = createEmptySundayBulletinWeekly(weekly)

  const emitChange = (patch) => {
    onChange({
      ...data,
      ...patch,
    })
  }

  const handleFieldChange = (key, value) => {
    emitChange({ [key]: value })
  }

  const handleSeasonWeekChange = (rawValue) => {
    const digitsOnly = String(rawValue ?? '').replace(/\D/g, '')
    handleFieldChange('seasonWeek', digitsOnly)
  }

  const handleLockToggle = (key, checked) => {
    const nextLocks = {
      ...data.locks,
      [key]: checked,
    }
    const nextOverrides = { ...data.fixedOverrides }

    // 해제 시 현재 기본값을 채워 바로 수정할 수 있게 함
    if (!checked) {
      const current = String(nextOverrides[key] ?? '').trim()
      if (!current) {
        nextOverrides[key] = getBulletinFieldDefault(key)
      }
    }

    emitChange({
      locks: nextLocks,
      fixedOverrides: nextOverrides,
    })
  }

  const handleOverrideChange = (key, value) => {
    emitChange({
      fixedOverrides: {
        ...data.fixedOverrides,
        [key]: value,
      },
    })
  }

  return (
    <div className="sunday-bulletin-editor">
      <p className="sunday-bulletin-form__intro">
        주일예배 주보 서식이 불러와졌습니다. 매주 변경되는 항목을 수정하고, 아래 고정 항목은 오른쪽
        체크박스로 잠금/수정을 선택할 수 있습니다. 체크되어 있으면 기본 고정값으로 표시되고, 체크를
        해제하면 직접 수정할 수 있습니다.
      </p>

      {SUNDAY_BULLETIN_WEEKLY_FIELDS.map((field) => {
        const fieldId = `bulletin-embed-${field.key}`
        const value = data?.[field.key] ?? ''

        return (
          <div key={field.key} className="board-write-form__field">
            <label htmlFor={fieldId} className="board-write-form__label">
              {field.label}
            </label>
            {field.hint ? <p className="sunday-bulletin-form__hint">{field.hint}</p> : null}
            {field.type === 'seasonWeekNumber' ? (
              <div className="sunday-bulletin-form__season-week">
                <span className="sunday-bulletin-form__season-fixed">성령강림절 후 제</span>
                <input
                  id={fieldId}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="board-write-form__input sunday-bulletin-form__season-input"
                  value={extractSeasonWeekNumber(value)}
                  onChange={(event) => handleSeasonWeekChange(event.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  autoComplete={AUTOCOMPLETE_OFF}
                  aria-label="성령강림절 후 주차"
                />
                <span className="sunday-bulletin-form__season-fixed">주</span>
              </div>
            ) : field.multiline ? (
              <textarea
                id={fieldId}
                className="board-write-form__input sunday-bulletin-form__textarea"
                value={value}
                onChange={(event) => handleFieldChange(field.key, event.target.value)}
                disabled={disabled}
                rows={10}
                placeholder={field.placeholder}
                autoComplete={AUTOCOMPLETE_OFF}
              />
            ) : (
              <input
                id={fieldId}
                type="text"
                className="board-write-form__input"
                value={value}
                onChange={(event) => handleFieldChange(field.key, event.target.value)}
                disabled={disabled}
                placeholder={field.placeholder}
                autoComplete={AUTOCOMPLETE_OFF}
              />
            )}
          </div>
        )
      })}

      <section className="sunday-bulletin-form__fixed-section" aria-label="주보 고정 항목">
        <h3 className="sunday-bulletin-form__fixed-title">고정 항목</h3>
        <p className="sunday-bulletin-form__fixed-help">
          체크됨 = 고정(기본값 사용) / 체크 해제 = 직접 수정
        </p>

        {SUNDAY_BULLETIN_LOCKABLE_FIELDS.map((field) => {
          const fieldId = `bulletin-fixed-${field.key}`
          const lockId = `${fieldId}-lock`
          const locked = isBulletinFieldLocked(data, field.key)
          const value = locked
            ? getBulletinFieldDefault(field.key)
            : (data.fixedOverrides?.[field.key] ?? getBulletinFieldDefault(field.key))

          return (
            <div key={field.key} className="board-write-form__field sunday-bulletin-form__fixed-field">
              <div className="sunday-bulletin-form__fixed-header">
                <label htmlFor={fieldId} className="board-write-form__label">
                  {field.label}
                </label>
                <label htmlFor={lockId} className="sunday-bulletin-form__lock">
                  <input
                    id={lockId}
                    type="checkbox"
                    className="sunday-bulletin-form__lock-input"
                    checked={locked}
                    onChange={(event) => handleLockToggle(field.key, event.target.checked)}
                    disabled={disabled}
                  />
                  <span className="sunday-bulletin-form__lock-text">
                    {locked ? '고정' : '수정'}
                  </span>
                </label>
              </div>
              {field.hint ? <p className="sunday-bulletin-form__hint">{field.hint}</p> : null}
              {field.multiline ? (
                <textarea
                  id={fieldId}
                  className="board-write-form__input sunday-bulletin-form__textarea"
                  value={value}
                  onChange={(event) => handleOverrideChange(field.key, event.target.value)}
                  disabled={disabled || locked}
                  rows={field.rows ?? 5}
                  autoComplete={AUTOCOMPLETE_OFF}
                  readOnly={locked}
                />
              ) : (
                <input
                  id={fieldId}
                  type="text"
                  className="board-write-form__input"
                  value={value}
                  onChange={(event) => handleOverrideChange(field.key, event.target.value)}
                  disabled={disabled || locked}
                  autoComplete={AUTOCOMPLETE_OFF}
                  readOnly={locked}
                />
              )}
            </div>
          )
        })}
      </section>

      {showPreview ? (
        <div className="sunday-bulletin-form__preview" aria-label="주보 미리보기">
          <h3 className="sunday-bulletin-form__preview-title">주보 미리보기</h3>
          <SundayBulletin weekly={data} />
        </div>
      ) : null}
    </div>
  )
}

export default SundayBulletinEditor
