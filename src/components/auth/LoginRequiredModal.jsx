import Modal from '@/components/common/Modal'
import './LoginRequiredModal.css'

function LoginRequiredModal({ isOpen, onLogin }) {
  return (
    <Modal isOpen={isOpen} title="로그인이 필요한 서비스입니다." onClose={onLogin}>
      <p className="login-required-modal__message">
        교회소식 및 교회앨범은
        <br />
        로그인 후 이용하실 수 있습니다.
      </p>
      <div className="login-required-modal__actions">
        <button type="button" className="login-required-modal__button login-required-modal__button--ghost" onClick={onLogin}>
          확인
        </button>
        <button type="button" className="login-required-modal__button login-required-modal__button--primary" onClick={onLogin}>
          로그인하기
        </button>
      </div>
    </Modal>
  )
}

export default LoginRequiredModal
