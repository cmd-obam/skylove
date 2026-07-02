import { Link } from 'react-router-dom'
import { FiCheckCircle } from 'react-icons/fi'

function SignupStepComplete() {
  return (
    <div className="signup-step-complete">
      <div className="signup-step-complete__icon" aria-hidden="true">
        <FiCheckCircle />
      </div>
      <h1 className="signup-step-complete__title">회원가입이 완료되었습니다.</h1>
      <p className="signup-step-complete__message">
        하늘사랑교회 홈페이지 회원이 되신 것을 환영합니다.
      </p>
      <p className="signup-step-complete__note">
        가입 승인 후
        <br />
        로그인이 가능합니다.
      </p>
      <Link to="/login" className="signup-btn signup-btn--primary signup-step-complete__button">
        로그인 하러가기
      </Link>
    </div>
  )
}

export default SignupStepComplete
