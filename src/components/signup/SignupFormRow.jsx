function SignupFormRow({
  label,
  required = false,
  htmlFor,
  hint,
  alwaysShowHint = false,
  reserveFeedback = false,
  error,
  success,
  rowClassName = '',
  children,
}) {
  const showHint = Boolean(hint) && (alwaysShowHint || (!error && !success))

  return (
    <div
      className={`signup-info-form__row${error ? ' signup-info-form__row--error' : ''}${
        rowClassName ? ` ${rowClassName}` : ''
      }`}
    >
      <div className="signup-info-form__label-cell">
        <label className="signup-info-form__label" htmlFor={htmlFor}>
          {required && (
            <span className="signup-info-form__required" aria-hidden="true">
              *
            </span>
          )}
          {required ? ` ${label}` : label}
        </label>
      </div>
      <div className="signup-info-form__control-cell">
        {children}
        {showHint && <p className="signup-info-form__hint">{hint}</p>}
        {reserveFeedback ? (
          <div className="signup-info-form__feedback-slot" aria-live="polite">
            {error ? (
              <p className="signup-info-form__message signup-info-form__message--error" role="alert">
                {error}
              </p>
            ) : success ? (
              <p className="signup-info-form__message signup-info-form__message--success">
                {success}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {error && (
              <p className="signup-info-form__message signup-info-form__message--error" role="alert">
                {error}
              </p>
            )}
            {!error && success && (
              <p className="signup-info-form__message signup-info-form__message--success">
                {success}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SignupFormRow
