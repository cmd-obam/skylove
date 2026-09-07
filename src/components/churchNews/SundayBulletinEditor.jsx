import { useState } from 'react'
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

function summarizeValue(value, multiline = false) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!text) {
    return '내용 없음'
  }
  if (multiline) {
    const lines = String(value ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length > 1) {
      return `${lines[0]} 외 ${lines.length - 1}줄`
    }
  }
  return text.length > 42 ? `${text.slice(0, 42)}…` : text
}

function SundayBulletinEditor({ weekly, onChange, disabled = false, showPreview = true }) {
  const data = createEmptySundayBulletinWeekly(weekly)
  const [openKeys, setOpenKeys] = useState(() => new Set())

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
      setOpenKeys((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
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

  const toggleOpen = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const expandAll = () => {
    setOpenKeys(new Set(SUNDAY_BULLETIN_FORM_FIELDS.map((field) => field.key)))
  }

  const collapseAll = () => {
    setOpenKeys(new Set())
  }

  return (
    <div className="sunday-bulletin-editor">
      <p className="sunday-bulletin-form__intro">
        주일예배 주보 서식입니다. 항목을 눌러 펼치거나 접을 수 있습니다. 오른쪽에 체크박스가 있는
        항목은 체크되어 있으면 고정(기본값), 체크를 해제하면 직접 수정할 수 있습니다.
      </p>

      <div className="sunday-bulletin-form__accordion-actions">
        <button
          type="button"
          className="sunday-bulletin-form__accordion-action"
          onClick={expandAll}
          disabled={disabled}
        >
          전체 펼치기
        </button>
        <button
          type="button"
          className="sunday-bulletin-form__accordion-action"
          onClick={collapseAll}
          disabled={disabled}
        >
          전체 접기
        </button>
      </div>

      {SUNDAY_BULLETIN_FORM_FIELDS.map((field) => {
        const fieldId = `bulletin-field-${field.key}`
        const lockId = `${fieldId}-lock`
        const panelId = `${fieldId}-panel`
        const isLockable = Boolean(field.lockable)
        const locked = isLockable ? isBulletinFieldLocked(data, field.key) : false
        const value = isLockable
          ? locked
            ? getBulletinFieldDefault(field.key)
            : (data.fixedOverrides?.[field.key] ?? getBulletinFieldDefault(field.key))
          : (data?.[field.key] ?? '')
        const fieldDisabled = disabled || (isLockable && locked)
        const isOpen = openKeys.has(field.key)
        const summary =
          field.type === 'seasonWeekNumber'
            ? extractSeasonWeekNumber(value)
              ? `제 ${extractSeasonWeekNumber(value)} 주`
              : '내용 없음'
            : summarizeValue(value, field.multiline)

        return (
          <div
            key={field.key}
            className={`board-write-form__field sunday-bulletin-form__accordion${
              isOpen ? ' sunday-bulletin-form__accordion--open' : ''
            }${isLockable ? ' sunday-bulletin-form__fixed-field' : ''}`}
          >
            <div className="sunday-bulletin-form__accordion-header">
              <button
                type="button"
                className="sunday-bulletin-form__accordion-toggle"
                onClick={() => toggleOpen(field.key)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={disabled}
              >
                <span className="sunday-bulletin-form__accordion-chevron" aria-hidden="true">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="sunday-bulletin-form__accordion-label">{field.label}</span>
                {!isOpen ? (
                  <span className="sunday-bulletin-form__accordion-summary">{summary}</span>
                ) : null}
              </button>

              {isLockable ? (
                <label
                  htmlFor={lockId}
                  className="sunday-bulletin-form__lock"
                  onClick={(event) => event.stopPropagation()}
                >
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

            {isOpen ? (
              <div id={panelId} className="sunday-bulletin-form__accordion-panel">
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
            ) : null}
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
