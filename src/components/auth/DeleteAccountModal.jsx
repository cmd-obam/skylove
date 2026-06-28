import './DeleteAccountModal.css'

function DeleteAccountModal({ isOpen, isDeleting, error, onCancel, onConfirm }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="delete-account-modal" role="presentation">
      <div
        className="delete-account-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-modal-title"
      >
        <h2 id="delete-account-modal-title" className="delete-account-modal__title">
          회원탈퇴
        </h2>
        <div className="delete-account-modal__content">
          <p className="delete-account-modal__question">정말 회원탈퇴 하시겠습니까?</p>
          <p className="delete-account-modal__description">
            회원탈퇴를 진행하면
            {'\n\n'}
            • 계정 정보
            {'\n'}
            • 회원 프로필
            {'\n'}
            • 저장된 개인정보
            {'\n\n'}
            가 모두 삭제됩니다.
            {'\n\n'}
            이 작업은 되돌릴 수 없습니다.
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
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            className="signup-btn signup-btn--danger signup-btn--full"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '탈퇴 처리 중...' : '회원탈퇴'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccountModal
