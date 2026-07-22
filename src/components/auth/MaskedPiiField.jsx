import { useEffect, useRef, useState } from 'react'
import { FiEye } from 'react-icons/fi'
import { revealMemberPiiForSuperAdmin } from '@/services/auth/memberManagement'
import {
  PII_REVEAL_DURATION_MS,
  getPiiFieldLabel,
  maskPiiValue,
} from '@/utils/maskPii'

function PiiConfirmModal({ isOpen, fieldLabel, isSubmitting, onCancel, onConfirm }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="member-management-modal member-management-modal--pii" role="presentation">
      <div
        className="member-management-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-pii-reveal-title"
      >
        <h2 id="member-pii-reveal-title" className="member-management-modal__title">
          개인정보 조회
        </h2>
        <p className="member-management-modal__message">
          회원의 {fieldLabel} 개인정보를 조회하시겠습니까?
          <br />
          개인정보 조회는 기록됩니다.
        </p>
        <div className="member-management-modal__actions">
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="member-management-modal__button member-management-modal__button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '조회 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 이메일/휴대폰 마스킹 표시 + 전체보기(확인 후 일시 공개, 감사 로그 기록)
 */
function MaskedPiiField({
  field,
  value,
  targetUserId,
  targetName = '',
  context = 'detail',
  className = '',
}) {
  const [revealed, setRevealed] = useState(false)
  const [displayValue, setDisplayValue] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const remaskTimerRef = useRef(null)

  const fieldLabel = getPiiFieldLabel(field)
  const masked = maskPiiValue(field, value)
  const hasValue = value != null && String(value).trim() !== ''

  useEffect(() => {
    return () => {
      if (remaskTimerRef.current) {
        window.clearTimeout(remaskTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setRevealed(false)
    setDisplayValue(null)
    setError('')

    if (remaskTimerRef.current) {
      window.clearTimeout(remaskTimerRef.current)
      remaskTimerRef.current = null
    }
  }, [value, targetUserId, field])

  const handleConfirmReveal = async () => {
    if (!targetUserId || !hasValue) {
      setConfirmOpen(false)
      return
    }

    setSubmitting(true)
    setError('')

    const result = await revealMemberPiiForSuperAdmin({
      targetUserId,
      targetName,
      fieldName: field,
      context,
    })

    setSubmitting(false)

    if (!result.success) {
      setError(result.message || '개인정보 조회에 실패했습니다.')
      return
    }

    setConfirmOpen(false)
    setDisplayValue(result.value)
    setRevealed(true)

    if (remaskTimerRef.current) {
      window.clearTimeout(remaskTimerRef.current)
    }

    remaskTimerRef.current = window.setTimeout(() => {
      setRevealed(false)
      setDisplayValue(null)
      remaskTimerRef.current = null
    }, PII_REVEAL_DURATION_MS)
  }

  return (
    <div className={`masked-pii-field ${className}`.trim()}>
      <span className="masked-pii-field__value" title={revealed ? undefined : '마스킹된 개인정보'}>
        {revealed ? displayValue || value : masked}
      </span>

      {hasValue && !revealed && (
        <button
          type="button"
          className="masked-pii-field__reveal"
          onClick={() => {
            setError('')
            setConfirmOpen(true)
          }}
        >
          <FiEye aria-hidden="true" />
          <span>전체보기</span>
        </button>
      )}

      {revealed && (
        <span className="masked-pii-field__hint" aria-live="polite">
          잠시 후 다시 마스킹됩니다
        </span>
      )}

      {error ? (
        <span className="masked-pii-field__error" role="alert">
          {error}
        </span>
      ) : null}

      <PiiConfirmModal
        isOpen={confirmOpen}
        fieldLabel={fieldLabel}
        isSubmitting={submitting}
        onCancel={() => {
          if (!submitting) {
            setConfirmOpen(false)
            setError('')
          }
        }}
        onConfirm={handleConfirmReveal}
      />
    </div>
  )
}

export default MaskedPiiField
