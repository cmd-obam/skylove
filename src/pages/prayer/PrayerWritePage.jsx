import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerForm from '@/components/prayer/PrayerForm'
import { prayerDetailPath } from '@/data/prayerMenu'
import { EMPTY_PRAYER_DRAFT, validatePrayerDraft } from '@/services/prayer/present'
import { createPrayerRequest } from '@/services/prayer/requests'
import './Prayer.css'

function PrayerWritePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(EMPTY_PRAYER_DRAFT)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validation = validatePrayerDraft(draft)

    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')
    const result = await createPrayerRequest(draft)
    setSubmitting(false)

    if (!result.success) {
      setError(result.message)
      return
    }

    navigate(prayerDetailPath(result.id), { replace: true })
  }

  return (
    <PrayerCopyGuard>
      <div className="prayer-page prayer-page--write">
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
          />
        </div>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerWritePage
