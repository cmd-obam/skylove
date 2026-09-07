import SundayBulletin from '@/components/churchNews/SundayBulletin'
import { SUNDAY_BULLETIN_FORM_FIELDS } from '@/data/sundayBulletinFixed'
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
        주일예배 주보 서식입니다. 매주 입력 항목은 바로 수정하고, 오른쪽에 체크박스가 있는 항목은
        체크되어 있으면 고정(기본값), 체크를 해제하면 직접 수정할 수 있습니다.
      </p>

      {SUNDAY_BULLETIN_FORM_FIELDS.map((field) => {
        const fieldId = `bulletin-field-${field.key}`
        const lockId = `${fieldId}-lock`
        const isLockable = Boolean(field.lockable)
        const locked = isLockable ? isBulletinFieldLocked(data, field.key) : false
        const value = isLockable
          ? locked
            ? getBulletinFieldDefault(field.key)
            : (data.fixedOverrides?.[field.key] ?? getBulletinFieldDefault(field.key))
          : (data?.[field.key] ?? '')
        const fieldDisabled = disabled || (isLockable && locked)

        return (
          <div
            key={field.key}
            className={`board-write-form__field${isLockable ? ' sunday-bulletin-form__fixed-field' : ''}`}
          >
            <div className="sunday-bulletin-form__field-header">
              <label htmlFor={fieldId} className="board-write-form__label">
                {field.label}
              </label>
              {isLockable ? (
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
              ) : null}
            </div>

            {field.hint ? <p className="sunday-bulletin-form__hint">{field.hint}</p> : null}

            {field.type === 'seasonWeekNumber' ? (
              <div className="sunday-bulletin-form__season-week">
                <span className="sunday-bulletin-form__season-fixed">제</span>
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
                onChange={(event) =>
                  isLockable
                    ? handleOverrideChange(field.key, event.target.value)
                    : handleFieldChange(field.key, event.target.value)
                }
                disabled={fieldDisabled}
                readOnly={isLockable && locked}
                rows={field.rows ?? (isLockable ? 5 : 10)}
                placeholder={field.placeholder}
                autoComplete={AUTOCOMPLETE_OFF}
              />
            ) : (
              <input
                id={fieldId}
                type="text"
                className="board-write-form__input"
                value={value}
                onChange={(event) =>
                  isLockable
                    ? handleOverrideChange(field.key, event.target.value)
                    : handleFieldChange(field.key, event.target.value)
                }
                disabled={fieldDisabled}
                readOnly={isLockable && locked}
                placeholder={field.placeholder}
                autoComplete={AUTOCOMPLETE_OFF}
              />
            )}
          </div>
        )
      })}

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
