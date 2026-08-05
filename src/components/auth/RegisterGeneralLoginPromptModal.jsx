import './DeleteAccountModal.css'

function RegisterGeneralLoginPromptModal({ isOpen, onCancel, onContinue }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="delete-account-modal" role="presentation">
      <div
        className="delete-account-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-general-login-prompt-title"
      >
        <h2 id="register-general-login-prompt-title" className="delete-account-modal__title">
          일반 로그인 계정 등록
        </h2>
        <div className="delete-account-modal__content">
          <p className="delete-account-modal__question">
            현재 카카오 로그인만 사용 중입니다.
          </p>
          <p className="delete-account-modal__description">
            카카오 계정 연동을 해제하려면
            {'\n'}
            먼저 일반 로그인 계정을 등록해야 합니다.
            {'\n\n'}
            등록 후에는
            {'\n'}
            • 아이디 로그인
            {'\n'}
            • 이메일 로그인
            {'\n'}
            • 비밀번호 찾기
            {'\n'}
            기능을 모두 사용할 수 있습니다.
          </p>
        </div>
        <div className="delete-account-modal__actions">
          <button
            type="button"
            className="signup-btn signup-btn--secondary signup-btn--full"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="signup-btn signup-btn--primary signup-btn--full"
            onClick={onContinue}
          >
            일반 로그인 등록
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterGeneralLoginPromptModal
