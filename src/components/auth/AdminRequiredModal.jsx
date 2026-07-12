import Modal from '@/components/common/Modal'
import './LoginRequiredModal.css'

function AdminRequiredModal({ isOpen, onConfirm }) {
  return (
    <Modal isOpen={isOpen} title="관리자 권한이 필요한 서비스입니다." onClose={onConfirm}>
      <p className="login-required-modal__message">관리자 권한이 필요한 서비스입니다.</p>
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

export default AdminRequiredModal
