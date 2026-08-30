import SundayBulletin from '@/components/churchNews/SundayBulletin'
import { SUNDAY_BULLETIN_WEEKLY_FIELDS } from '@/data/sundayBulletinFixed'
import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import './SundayBulletinForm.css'

function SundayBulletinEditor({ weekly, onChange, disabled = false, showPreview = true }) {
  const handleFieldChange = (key, value) => {
    onChange({
      ...weekly,
      [key]: value,
    })
  }

  return (
    <div className="sunday-bulletin-editor">
      <p className="sunday-bulletin-form__intro">
        주일예배 주보 서식이 불러와졌습니다. 매주 변경되는 항목만 수정하면 됩니다. 섬기는 사람, 선교 및 후원,
        엘샤다이중창단은 고정입니다.
      </p>

      {SUNDAY_BULLETIN_WEEKLY_FIELDS.map((field) => {
        const fieldId = `bulletin-embed-${field.key}`
        const value = weekly?.[field.key] ?? ''

        return (
          <div key={field.key} className="board-write-form__field">
            <label htmlFor={fieldId} className="board-write-form__label">
              {field.label}
            </label>
            {field.hint ? <p className="sunday-bulletin-form__hint">{field.hint}</p> : null}
            {field.multiline ? (
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

      {showPreview ? (
        <div className="sunday-bulletin-form__preview" aria-label="주보 미리보기">
          <h3 className="sunday-bulletin-form__preview-title">주보 미리보기</h3>
          <SundayBulletin weekly={weekly} />
        </div>
      ) : null}
    </div>
  )
}

export default SundayBulletinEditor
