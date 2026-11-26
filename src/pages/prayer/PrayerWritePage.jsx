import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerForm from '@/components/prayer/PrayerForm'
import PrayerHero from '@/components/prayer/PrayerHero'
import { prayerDetailPath } from '@/data/prayerMenu'
import { applyPrayerCardTitle, EMPTY_PRAYER_DRAFT, validatePrayerDraft } from '@/services/prayer/present'
import { createPrayerRequest } from '@/services/prayer/requests'
import './Prayer.css'

function PrayerWritePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(EMPTY_PRAYER_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const hasWrittenText = [draft.writerName, draft.otherText, draft.content].some(
    (value) => String(value ?? '').length > 0,
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextDraft = applyPrayerCardTitle(draft)
    const validation = validatePrayerDraft(nextDraft)

    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')
    const result = await createPrayerRequest(nextDraft)
    setSubmitting(false)

    if (!result.success) {
      setError(result.message)
      return
    }

    navigate(prayerDetailPath(result.id), { replace: true })
  }

  const handleBack = () => {
    if (hasWrittenText) {
      setConfirmLeave(true)
      return
    }

    navigate(-1)
  }

  return (
    <PrayerCopyGuard>
      <div className="prayer-page prayer-page--write">
        <PrayerHero title="기도 제목 작성" />
        <div className="prayer-page__inner">
          <header className="prayer-write-head">
            <p className="prayer-write-head__crumb">
              <Link to="/">HOME</Link>
              <span aria-hidden="true"> / </span>
              <span>기도 제목 작성</span>
            </p>
            <h1>기도 제목 작성</h1>
            <p>함께 나누고 싶은 기도 제목을 남겨주세요. 하늘사랑교회가 함께 기도하겠습니다.</p>
          </header>
          <PrayerForm
            draft={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
            submitLabel="기도 제목 올리기"
            onBack={handleBack}
          />
        </div>
        <Modal isOpen={confirmLeave} title="이전 페이지로 돌아갈까요?" onClose={() => setConfirmLeave(false)}>
          <p>이전 페이지로 이동하면 작성된 내용은 사라집니다.</p>
          <div className="prayer-inline-actions">
            <button type="button" className="prayer-button" onClick={() => navigate(-1)}>
              확인
            </button>
            <button type="button" className="prayer-button prayer-button--ghost" onClick={() => setConfirmLeave(false)}>
              취소
            </button>
          </div>
        </Modal>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerWritePage
