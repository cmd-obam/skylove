function SignupEmailPending({
  email,
  resendCooldown,
  isSendingEmail,
  isCheckingEmail,
  isAutoChecking,
  formFeedback,
  onCheck,
  onResend,
  onEdit,
}) {
  return (
    <section className="signup-verify-panel signup-verify-panel--pending" aria-label="이메일 인증 대기">
      <p className="signup-verify-panel__eyebrow">이메일 인증 대기</p>
      <h2 className="signup-verify-panel__title">이메일 인증을 진행해주세요.</h2>
      <p className="signup-verify-panel__text">
        회원가입이 거의 완료되었습니다.
        {'\n\n'}
        가입하신 이메일로 인증 메일을 발송했습니다.
        {'\n'}
        메일의 &apos;이메일 인증&apos; 버튼을 클릭해주세요.
        {'\n\n'}
        인증이 완료되면 자동으로 가입이 완료됩니다.
      </p>
      <p className="signup-verify-panel__note">{email}</p>
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
