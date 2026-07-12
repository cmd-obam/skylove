import Modal from '@/components/common/Modal'
import './LoginRequiredModal.css'

function AccessDeniedModal({ isOpen, onConfirm }) {
  return (
    <Modal isOpen={isOpen} title="접근 권한이 없습니다." onClose={onConfirm}>
      <p className="login-required-modal__message">접근 권한이 없습니다.</p>
      <div className="login-required-modal__actions">
        <button
          type="button"
          className="login-required-modal__button login-required-modal__button--primary"
          onClick={onConfirm}
        >
          확인
        </button>
      </div>
    </Modal>
  )
}

export default AccessDeniedModal
