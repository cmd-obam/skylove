import { useNavigate } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'

function SignupStepComplete() {
  const navigate = useNavigate()

  return (
    <div className="signup-step-complete">
      <div className="signup-step-complete__icon" aria-hidden="true">
        <FiCheckCircle />
      </div>
      <h1 className="signup-step-complete__title">회원가입이 완료되었습니다.</h1>
      <p className="signup-step-complete__message">
        하늘사랑교회 홈페이지에 오신 것을 환영합니다.
      </p>
      <button
        type="button"
        className="signup-btn signup-btn--primary signup-step-complete__button"
        onClick={() => navigate('/login')}
      >
        로그인 하러가기
      </button>
    </div>
  )
}

export default SignupStepComplete
