import { Link } from 'react-router-dom'
import { PASSWORD_PLACEHOLDER, PASSWORD_REQUIREMENT_HINT } from '@/services/auth/signup'
import {
  SECURITY_QUESTIONS,
  SECURITY_QUESTION_PLACEHOLDER,
} from '@/data/securityQuestions'
import BirthDateSelect from '@/components/signup/BirthDateSelect'
import PasswordInput from '@/components/signup/PasswordInput'

const SIGNUP_PASSWORD_CONFIRM_PLACEHOLDER = '비밀번호를 다시 입력해주세요'

function SignupFormRow({
  label,
  required = false,
  htmlFor,
  hint,
  error,
  success,
  children,
}) {
  return (
    <div className={`signup-info-form__row${error ? ' signup-info-form__row--error' : ''}`}>
      <div className="signup-info-form__label-cell">
        <label className="signup-info-form__label" htmlFor={htmlFor}>
          {required && (
            <span className="signup-info-form__required" aria-hidden="true">
              *
            </span>
          )}
          {label}
        </label>
      </div>
      <div className="signup-info-form__control-cell">
        {children}
        {hint && !error && !success && <p className="signup-info-form__hint">{hint}</p>}
        {error && (
          <p className="signup-info-form__message signup-info-form__message--error" role="alert">
            {error}
          </p>
        )}
        {!error && success && (
          <p className="signup-info-form__message signup-info-form__message--success">{success}</p>
        )}
      </div>
    </div>
  )
}

function SignupStepForm({
  form,
  errors,
  displayedPasswordError,
  displayedPasswordConfirmError,
  idCheckMessage,
  emailFieldSuccess,
  isIdChecked,
  isCheckingId,
  isSendingEmail,
  isCheckingEmail,
  isEmailVerified,
  emailSent,
  resendCooldown,
  isSubmitting,
  isSyncingEmailVerification,
  formFeedback,
  onSubmit,
  onCancel,
  updateField,
  setPasswordConfirmTouched,
  handleDuplicateCheck,
  handleEmailVerify,
  handleCheckEmailVerification,
  handleResendEmail,
  formatPhoneNumber,
}) {
  return (
    <form className="signup-info-form" onSubmit={onSubmit} noValidate autoComplete="off">
      <header className="signup-info-form__header">
        <h2 className="signup-info-form__title">기본정보 입력</h2>
        <p className="signup-info-form__notice">
          <span className="signup-info-form__required" aria-hidden="true">
            *
          </span>
          표시는 필수입력사항입니다.
        </p>
      </header>

      <div className="signup-info-form__panel">
        <SignupFormRow
          label="이름"
          required
          htmlFor="signup-name"
          hint="실명으로 입력해주세요."
          error={errors.name}
        >
          <input
            id="signup-name"
            name="name"
            type="text"
            className="signup-info-form__input"
            placeholder="이름을 입력하세요."
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            autoComplete="off"
          />
        </SignupFormRow>

        <SignupFormRow
          label="회원아이디"
          required
          htmlFor="signup-login-id"
          hint="4자리 이상, 영문·숫자·밑줄(_)만 사용할 수 있습니다."
          error={errors.loginId}
          success={!errors.loginId ? idCheckMessage : undefined}
        >
          <div className="signup-info-form__inline">
            <input
              id="signup-login-id"
              name="loginId"
              type="text"
              className="signup-info-form__input"
              placeholder="아이디를 입력하세요."
              value={form.loginId}
              onChange={(event) => updateField('loginId', event.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              className={`signup-btn signup-btn--gray${
                isIdChecked ? ' signup-btn--gray-verified' : ''
              }`}
              onClick={handleDuplicateCheck}
              disabled={isCheckingId}
            >
              {isCheckingId ? '확인 중...' : '중복확인'}
            </button>
          </div>
        </SignupFormRow>

        <SignupFormRow
          label="이메일"
          required
          htmlFor="signup-email"
          hint="이메일 인증을 완료해야 회원가입이 가능합니다."
          error={errors.email}
          success={emailFieldSuccess}
        >
          <div className="signup-info-form__inline">
            <input
              id="signup-email"
              name="email"
              type="email"
              className="signup-info-form__input"
              placeholder="example@email.com"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              readOnly={isEmailVerified}
              autoComplete="off"
            />
            <button
              type="button"
              className={`signup-btn signup-btn--gray${
                isEmailVerified ? ' signup-btn--gray-verified' : ''
              }`}
              onClick={handleEmailVerify}
              disabled={isSendingEmail || isEmailVerified}
            >
              {isSendingEmail ? '발송 중...' : isEmailVerified ? '인증 완료' : '이메일 인증'}
            </button>
          </div>

          {emailSent && !isEmailVerified && (
            <div className="signup-info-form__email-actions">
              <button
                type="button"
                className="signup-btn signup-btn--gray signup-btn--full"
                onClick={handleCheckEmailVerification}
                disabled={isCheckingEmail || isSendingEmail}
              >
                {isCheckingEmail ? '확인 중...' : '인증 확인'}
              </button>
              <button
                type="button"
                className="signup-btn signup-btn--gray signup-btn--full"
                onClick={handleResendEmail}
                disabled={isSendingEmail || resendCooldown > 0}
              >
                {isSendingEmail
                  ? '발송 중...'
                  : resendCooldown > 0
                    ? `재발송 (${resendCooldown})`
                    : '인증 메일 재발송'}
              </button>
            </div>
          )}
        </SignupFormRow>

        <SignupFormRow
          label="비밀번호"
          required
          htmlFor="signup-password"
          hint={PASSWORD_REQUIREMENT_HINT}
          error={displayedPasswordError}
        >
          <PasswordInput
            id="signup-password"
            name="password"
            placeholder={PASSWORD_PLACEHOLDER}
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            className="signup-info-form__input"
            wrapperClassName="signup-info-form__password"
          />
        </SignupFormRow>

        <SignupFormRow
          label="비밀번호 확인"
          required
          htmlFor="signup-password-confirm"
          error={displayedPasswordConfirmError}
        >
          <PasswordInput
            id="signup-password-confirm"
            name="passwordConfirm"
            placeholder={SIGNUP_PASSWORD_CONFIRM_PLACEHOLDER}
            value={form.passwordConfirm}
            onChange={(event) => {
              setPasswordConfirmTouched(true)
              updateField('passwordConfirm', event.target.value)
            }}
            className="signup-info-form__input"
            wrapperClassName="signup-info-form__password"
          />
        </SignupFormRow>

        <SignupFormRow
          label="비밀번호 분실 시 질문"
          required
          htmlFor="signup-security-question"
          error={errors.securityQuestion}
        >
          <select
            id="signup-security-question"
            name="securityQuestion"
            className="signup-info-form__input signup-info-form__select"
            value={form.securityQuestion}
            onChange={(event) => updateField('securityQuestion', event.target.value)}
          >
            <option value="">{SECURITY_QUESTION_PLACEHOLDER}</option>
            {SECURITY_QUESTIONS.map((question) => (
              <option key={question.id} value={question.id}>
                {question.label}
              </option>
            ))}
          </select>
        </SignupFormRow>

        <SignupFormRow
          label="비밀번호 분실 시 답변"
          required
          htmlFor="signup-security-answer"
          error={errors.securityAnswer}
        >
          <input
            id="signup-security-answer"
            name="securityAnswer"
            type="text"
            className="signup-info-form__input"
            placeholder="비밀번호 분실 시 사용할 답변을 입력하세요."
            value={form.securityAnswer}
            onChange={(event) => updateField('securityAnswer', event.target.value)}
            autoComplete="off"
          />
        </SignupFormRow>

        <div className="signup-info-form__guide" role="note">
          <p className="signup-info-form__guide-title">비밀번호 찾기 안내</p>
          <ul className="signup-info-form__guide-list">
            <li>비밀번호를 분실한 경우, 이름·이메일과 함께 등록한 질문과 답변으로 본인 확인 후 재설정할 수 있습니다.</li>
            <li>비밀번호는 암호화되어 저장되며, 본인 확인 후 재설정할 수 있습니다.</li>
            <li>입력하신 질문과 답변은 비밀번호 찾기 외 다른 용도로 사용되지 않습니다.</li>
          </ul>
        </div>

        <SignupFormRow label="생년월일" required htmlFor="signup-birth-year" error={errors.birthDate}>
          <BirthDateSelect
            idPrefix="signup-birth"
            value={form.birthDate}
            onChange={(nextValue) => updateField('birthDate', nextValue)}
            className="signup-info-form__birth"
          />
        </SignupFormRow>

        <SignupFormRow label="휴대폰 번호" htmlFor="signup-phone" error={errors.phone}>
          <input
            id="signup-phone"
            name="phone"
            type="tel"
            className="signup-info-form__input"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(event) => updateField('phone', formatPhoneNumber(event.target.value))}
            autoComplete="off"
          />
        </SignupFormRow>

        <SignupFormRow label="이메일 수신" htmlFor="signup-agree-email">
          <label className="signup-info-form__checkbox-row" htmlFor="signup-agree-email">
            <input
              id="signup-agree-email"
              type="checkbox"
              className="signup-info-form__checkbox"
              checked={form.agreeEmail}
              onChange={(event) => updateField('agreeEmail', event.target.checked)}
            />
            <span>이메일 수신에 동의합니다. (선택)</span>
          </label>
        </SignupFormRow>
      </div>

      {formFeedback && (
        <p
          className={`signup-form__feedback signup-form__feedback--${formFeedback.type}`}
          role={formFeedback.type === 'error' ? 'alert' : 'status'}
        >
          {formFeedback.message}
        </p>
      )}

      <div className="signup-info-form__actions">
        <button
          type="submit"
          className="signup-btn signup-btn--dark"
          disabled={isSubmitting || isSyncingEmailVerification || !isEmailVerified}
        >
          {isSubmitting ? '가입 처리 중...' : '다음단계'}
        </button>
        <button type="button" className="signup-btn signup-btn--cancel" onClick={onCancel}>
          취소
        </button>
      </div>

      <p className="signup-form__login">
        이미 회원이신가요?
        <Link to="/login" className="signup-form__login-link">
          로그인하기
        </Link>
      </p>
    </form>
  )
}

export default SignupStepForm
