import { FiCheck, FiEdit3, FiFileText, FiMail, FiMonitor } from 'react-icons/fi'

const STEPS = [
  { id: 1, label: '약관동의', icon: FiFileText },
  { id: 2, label: '정보입력', icon: FiEdit3 },
  { id: 3, label: '이메일 인증', icon: FiMail },
  { id: 4, label: '가입완료', icon: FiMonitor },
]

function SignupProgress({ currentStep }) {
  return (
    <nav className="signup-progress" aria-label="회원가입 진행 단계">
      <ol className="signup-progress__list">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isCompleted = currentStep > step.id
          const isActive = currentStep === step.id
          const isUpcoming = currentStep < step.id

          return (
            <li
              key={step.id}
              className={`signup-progress__item${
                isActive ? ' signup-progress__item--active' : ''
              }${isCompleted ? ' signup-progress__item--completed' : ''}${
                isUpcoming ? ' signup-progress__item--upcoming' : ''
              }`}
            >
              <div className="signup-progress__step" aria-current={isActive ? 'step' : undefined}>
                <span className="signup-progress__badge" aria-hidden="true">
                  {isCompleted ? <FiCheck /> : <Icon />}
                </span>
                <span className="signup-progress__label">
                  <span className="signup-progress__eyebrow">STEP {String(step.id).padStart(2, '0')}</span>
                  <span className="signup-progress__title">{step.label}</span>
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span className="signup-progress__connector" aria-hidden="true">
                  <span className="signup-progress__connector-line" />
                  <span className="signup-progress__connector-arrow" />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default SignupProgress
