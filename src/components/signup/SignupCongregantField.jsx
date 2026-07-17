import {
  ATTENDING_CHURCH_PLACEHOLDER,
  CONGREGANT_TYPES,
  isOtherCongregantType,
} from '@/data/congregantTypes'
import SignupFormRow from '@/components/signup/SignupFormRow'

function SignupCongregantField({
  form,
  errors,
  updateField,
  idPrefix = 'signup',
  radioName = 'congregantType',
}) {
  return (
    <SignupFormRow
      label="교인 구분"
      required
      htmlFor={`${idPrefix}-congregant-own`}
      error={errors.congregantType}
    >
      <div className="signup-info-form__radio-group" role="radiogroup" aria-label="교인 구분">
        {CONGREGANT_TYPES.map((option) => {
          const optionId = `${idPrefix}-congregant-${option.id}`
          const isOther = isOtherCongregantType(option.id)
          const isChecked = form.congregantType === option.id
          const attendingChurchLabelId = `${idPrefix}-attending-church-label`
          const attendingChurchInputId = `${idPrefix}-attending-church`

          return (
            <div
              key={option.id}
              className={`signup-info-form__radio-row${
                isOther ? ' signup-info-form__radio-row--other' : ''
              }`}
            >
              <label className="signup-info-form__radio-option" htmlFor={optionId}>
                <input
                  id={optionId}
                  type="radio"
                  name={radioName}
                  className="signup-info-form__radio"
                  value={option.id}
                  checked={isChecked}
                  onChange={() => updateField('congregantType', option.id)}
                />
                <span>{option.label}</span>
              </label>

              {isOther && (
                <div className="signup-info-form__attending-church">
                  <span
                    className="signup-info-form__attending-church-label"
                    id={attendingChurchLabelId}
                  >
                    출석 교회
                  </span>
                  <input
                    id={attendingChurchInputId}
                    name="attendingChurch"
                    type="text"
                    className="signup-info-form__input"
                    placeholder={ATTENDING_CHURCH_PLACEHOLDER}
                    value={form.attendingChurch}
                    onChange={(event) => updateField('attendingChurch', event.target.value)}
                    disabled={!isChecked}
                    autoComplete="off"
                    aria-labelledby={attendingChurchLabelId}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SignupFormRow>
  )
}

export default SignupCongregantField
