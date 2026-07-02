import { SIGNUP_AGREE_ALL_LABEL, SIGNUP_TERM_SECTIONS } from '@/data/signupPolicies'

function PolicyAgreementBlock({ id, title, content, value, onChange }) {
  return (
    <section className="signup-policy-block" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="signup-policy-block__title">
        <span className="signup-policy-block__bullet" aria-hidden="true" />
        {title}
      </h2>
      <div
        className="signup-policy-scroll"
        tabIndex={0}
        role="document"
        aria-label={`${title} 전문`}
      >
        <div className="signup-policy-scroll__inner">{content}</div>
      </div>
      <fieldset className="signup-policy-block__choices">
        <legend className="signup-policy-block__legend">{title} 동의 여부</legend>
        <label className="signup-policy-block__choice" htmlFor={`${id}-agree`}>
          <input
            id={`${id}-agree`}
            type="radio"
            name={id}
            className="signup-policy-block__radio"
            value="agree"
            checked={value === 'agree'}
            onChange={() => onChange('agree')}
          />
          <span className="signup-policy-block__choice-text">동의함</span>
        </label>
        <label className="signup-policy-block__choice" htmlFor={`${id}-disagree`}>
          <input
            id={`${id}-disagree`}
            type="radio"
            name={id}
            className="signup-policy-block__radio"
            value="disagree"
            checked={value === 'disagree'}
            onChange={() => onChange('disagree')}
          />
          <span className="signup-policy-block__choice-text">동의하지않음</span>
        </label>
      </fieldset>
    </section>
  )
}

function SignupStepTerms({
  agreements,
  onChangeAgreement,
  onChangeAll,
  allChecked,
  allRequiredChecked,
  onNext,
}) {
  return (
    <div className="signup-step-terms">
      <div className="signup-step-terms__panel">
        <div className="signup-step-terms__sections">
          {SIGNUP_TERM_SECTIONS.map((section) => (
            <PolicyAgreementBlock
              key={section.key}
              id={`signup-policy-${section.id}`}
              title={section.title}
              content={section.content}
              value={agreements[section.key]}
              onChange={(nextValue) => onChangeAgreement(section.key, nextValue)}
            />
          ))}
        </div>
      </div>

      <label className="signup-policy-all" htmlFor="signup-policy-all">
        <input
          id="signup-policy-all"
          type="checkbox"
          className="signup-policy-all__checkbox"
          checked={allChecked}
          onChange={(event) => onChangeAll(event.target.checked)}
        />
        <span className="signup-policy-all__text">{SIGNUP_AGREE_ALL_LABEL}</span>
      </label>

      <div className="signup-wizard-actions signup-wizard-actions--end">
        <button
          type="button"
          className="signup-btn signup-btn--primary"
          disabled={!allRequiredChecked}
          onClick={onNext}
        >
          다음
        </button>
      </div>
    </div>
  )
}

export default SignupStepTerms
