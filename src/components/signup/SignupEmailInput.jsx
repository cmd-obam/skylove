import { useEffect, useState } from 'react'
import { SIGNUP_FIELD_AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  DEFAULT_SIGNUP_EMAIL_DOMAIN,
  SIGNUP_EMAIL_DOMAIN_CUSTOM,
  SIGNUP_EMAIL_DOMAIN_OPTIONS,
} from '@/data/signupEmailDomains'
import {
  buildSignupEmail,
  sanitizeEmailDomainPart,
  sanitizeEmailLocalPart,
  splitSignupEmail,
} from '@/utils/signupEmailInput'

function resolveComposerDomain(domain) {
  return domain || DEFAULT_SIGNUP_EMAIL_DOMAIN
}

function SignupEmailInput({ id = 'signup-email-local', email, disabled = false, onEmailChange }) {
  const initialParts = splitSignupEmail(email)
  const [localPart, setLocalPart] = useState(initialParts.local)
  const [domain, setDomain] = useState(initialParts.domain)
  const [customDomain, setCustomDomain] = useState(initialParts.customDomain)
  const [localAutofillLocked, setLocalAutofillLocked] = useState(true)
  const [customDomainAutofillLocked, setCustomDomainAutofillLocked] = useState(true)

  useEffect(() => {
    const parsed = splitSignupEmail(email)
    setLocalPart(parsed.local)
    setDomain(parsed.domain)
    setCustomDomain(parsed.customDomain)
  }, [email])

  const emitEmailChange = (nextLocal, nextDomain, nextCustomDomain) => {
    onEmailChange(
      buildSignupEmail(nextLocal, resolveComposerDomain(nextDomain), nextCustomDomain),
    )
  }

  const handleLocalChange = (event) => {
    const nextLocal = sanitizeEmailLocalPart(event.target.value)
    setLocalPart(nextLocal)
    emitEmailChange(nextLocal, domain, customDomain)
  }

  const handleDomainChange = (event) => {
    const nextDomain = event.target.value
    setDomain(nextDomain)
    emitEmailChange(localPart, nextDomain, customDomain)
  }

  const handleCustomDomainChange = (event) => {
    const nextCustomDomain = sanitizeEmailDomainPart(event.target.value)
    setCustomDomain(nextCustomDomain)
    emitEmailChange(localPart, domain, nextCustomDomain)
  }

  return (
    <div className="signup-info-form__email-composer">
      <input
        id={id}
        name="signup-mail-local"
        type="text"
        className="signup-info-form__input signup-info-form__email-local"
        placeholder="아이디"
        value={localPart}
        onChange={handleLocalChange}
        readOnly={disabled || localAutofillLocked}
        onFocus={() => {
          if (!disabled) setLocalAutofillLocked(false)
        }}
        onBlur={() => setLocalAutofillLocked(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
          }
        }}
        autoComplete={SIGNUP_FIELD_AUTOCOMPLETE_OFF}
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        aria-label="이메일 아이디"
      />
      <span className="signup-info-form__email-at" aria-hidden="true">
        @
      </span>
      <select
        id={`${id}-domain`}
        name="signup-mail-domain"
        className="signup-info-form__input signup-info-form__select signup-info-form__email-domain"
        value={resolveComposerDomain(domain)}
        onChange={handleDomainChange}
        disabled={disabled}
        autoComplete={SIGNUP_FIELD_AUTOCOMPLETE_OFF}
        aria-label="이메일 도메인 선택"
      >
        {SIGNUP_EMAIL_DOMAIN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {domain === SIGNUP_EMAIL_DOMAIN_CUSTOM && (
        <input
          id={`${id}-custom-domain`}
          name="signup-mail-domain-custom"
          type="text"
          className="signup-info-form__input signup-info-form__email-custom-domain"
          placeholder="example.com"
          value={customDomain}
          onChange={handleCustomDomainChange}
          readOnly={disabled || customDomainAutofillLocked}
          onFocus={() => {
            if (!disabled) setCustomDomainAutofillLocked(false)
          }}
          onBlur={() => setCustomDomainAutofillLocked(true)}
          autoComplete={SIGNUP_FIELD_AUTOCOMPLETE_OFF}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          aria-label="이메일 도메인 직접 입력"
        />
      )}
    </div>
  )
}

export default SignupEmailInput
