import { useState } from 'react'

function SignupEmailPending({
  email,
  resendCooldown,
  isSendingEmail,
  isCheckingEmail,
  isAutoChecking,
  isVerifyingOtp,
  formFeedback,
  onCheck,
  onResend,
  onVerifyOtp,
  onEdit,
}) {
  const [otpCode, setOtpCode] = useState('')

  const handleOtpSubmit = (event) => {
    event.preventDefault()
    onVerifyOtp?.(otpCode)
  }

  return (
    <section className="signup-verify-panel signup-verify-panel--pending" aria-label="이메일 인증 대기">
      <p className="signup-verify-panel__eyebrow">이메일 인증 대기</p>
      <h2 className="signup-verify-panel__title">이메일 인증을 진행해주세요.</h2>
      <p className="signup-verify-panel__text">
        가입하신 이메일로 인증 메일을 발송했습니다.
        {'\n\n'}
        1) 메일의 &apos;이메일 인증&apos; 버튼을
        {' '}
        <strong>회원가입을 진행 중인 같은 Chrome</strong>
        에서 클릭하거나
        {'\n'}
        2) 메일에 있는 6자리 인증번호를 아래에 입력해주세요.
        {'\n\n'}
        다른 브라우저·기기에서 링크를 열면 인증을 완료할 수 없습니다.
        {'\n'}
        인증이 완료되면 자동으로 가입이 완료됩니다.
      </p>
      <p className="signup-verify-panel__note">{email}</p>

      <form className="signup-verify-panel__otp-form" onSubmit={handleOtpSubmit}>
        <label className="signup-verify-panel__otp-label" htmlFor="signup-email-otp">
          이메일 인증번호
        </label>
        <div className="signup-verify-panel__otp-row">
          <input
            id="signup-email-otp"
            name="emailOtp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="signup-info-form__input signup-verify-panel__otp-input"
            placeholder="6자리 숫자"
            maxLength={8}
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          />
          <button
            type="submit"
            className="signup-btn signup-btn--dark"
            disabled={isVerifyingOtp || otpCode.trim().length < 6}
          >
            {isVerifyingOtp ? '확인 중...' : '인증번호 확인'}
          </button>
        </div>
      </form>

      <p className="signup-verify-panel__status" role="status">
        {isAutoChecking ? '인증 상태를 자동으로 확인하고 있습니다...' : '5초마다 인증 상태를 확인합니다.'}
      </p>

      {formFeedback && (
        <p
          className={`signup-form__feedback signup-form__feedback--${formFeedback.type}`}
          role={formFeedback.type === 'error' ? 'alert' : 'status'}
        >
          {formFeedback.message}
        </p>
      )}

      <div className="signup-verify-panel__actions">
        <button
          type="button"
          className="signup-btn signup-btn--gray signup-btn--full"
          onClick={onResend}
          disabled={isSendingEmail || resendCooldown > 0}
        >
          {isSendingEmail ? '발송 중...' : resendCooldown > 0 ? `인증 다시 보내기 (${resendCooldown})` : '인증 다시 보내기'}
        </button>
        <button
          type="button"
          className="signup-btn signup-btn--gray signup-btn--full"
          onClick={onCheck}
          disabled={isCheckingEmail || isAutoChecking}
        >
          {isCheckingEmail || isAutoChecking ? '인증 상태 확인 중...' : '인증 상태 확인'}
        </button>
        <button type="button" className="signup-btn signup-btn--cancel signup-btn--full" onClick={onEdit}>
          입력 정보 수정
        </button>
      </div>
    </section>
  )
}

export default SignupEmailPending
