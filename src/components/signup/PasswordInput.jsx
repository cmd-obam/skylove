import { PASSWORD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import { FiEye, FiEyeOff } from 'react-icons/fi'

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  className = '',
  autoComplete = PASSWORD_AUTOCOMPLETE_OFF,
  'aria-describedby': ariaDescribedBy,
  disabled = false,
  readOnly = false,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="signup-password-input">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        className={`signup-password-input__field signup-field-card__input signup-field-card__input--full ${className}`.trim()}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        readOnly={readOnly}
      />
      <button
        type="button"
        className="signup-password-input__toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
      </button>
    </div>
  )
}

export default PasswordInput
