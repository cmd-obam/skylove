import {
  ATTENDING_CHURCH_PLACEHOLDER,
  CONGREGANT_TYPE_OWN,
  CONGREGANT_TYPES,
  OWN_CHURCH_NAME,
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
  const isOtherSelected = isOtherCongregantType(form.congregantType)
  const attendingChurchValue =
    form.congregantType === CONGREGANT_TYPE_OWN
      ? OWN_CHURCH_NAME
      : isOtherSelected
        ? form.attendingChurch
        : ''

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
            </div>
          )
        })}
      </div>

      <div className="signup-info-form__attending-church">
        <label
          className="signup-info-form__attending-church-label"
          htmlFor={`${idPrefix}-attending-church`}
        >
          출석 교회{isOtherSelected ? ' *' : ''}
        </label>
        <input
          id={`${idPrefix}-attending-church`}
          name="attendingChurch"
          type="text"
          className="signup-info-form__input"
          placeholder={ATTENDING_CHURCH_PLACEHOLDER}
          value={attendingChurchValue}
          onChange={(event) => updateField('attendingChurch', event.target.value)}
          disabled={!isOtherSelected}
          required={isOtherSelected}
          autoComplete="off"
        />
      </div>
    </SignupFormRow>
  )
}

export default SignupCongregantField
