import './DeleteAccountModal.css'

function UnlinkKakaoModal({
  isOpen,
  isUnlinking,
  error,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="delete-account-modal" role="presentation">
      <div
        className="delete-account-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlink-kakao-modal-title"
      >
        <h2 id="unlink-kakao-modal-title" className="delete-account-modal__title">
          카카오 계정 연동 해제
        </h2>
        <div className="delete-account-modal__content">
          <p className="delete-account-modal__question">
            카카오 계정 연동을 해제하시겠습니까?
          </p>
          <p className="delete-account-modal__description">
            연동 해제 후에는
            {'\n'}
            아이디 + 비밀번호
            {'\n'}
            또는
            {'\n'}
            이메일 + 비밀번호
            {'\n'}
            로그인만 사용할 수 있습니다.
            {'\n\n'}
            카카오 로그인은 사용할 수 없습니다.
          </p>
        </div>
        {error && (
          <p className="signup-form__feedback signup-form__feedback--error" role="alert">
            {error}
          </p>
        )}
        <div className="delete-account-modal__actions">
          <button
            type="button"
            className="signup-btn signup-btn--secondary signup-btn--full"
            onClick={onCancel}
            disabled={isUnlinking}
          >
            취소
          </button>
          <button
            type="button"
            className="signup-btn signup-btn--danger signup-btn--full"
            onClick={onConfirm}
            disabled={isUnlinking}
          >
            {isUnlinking ? '연동 해제 중...' : '연동 해제'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnlinkKakaoModal
