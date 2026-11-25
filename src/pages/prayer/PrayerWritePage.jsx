import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerForm from '@/components/prayer/PrayerForm'
import PrayerHero, { prayerWriteHeroImage } from '@/components/prayer/PrayerHero'
import { PRAYER_PATH, prayerDetailPath } from '@/data/prayerMenu'
import { EMPTY_PRAYER_DRAFT, validatePrayerDraft } from '@/services/prayer/present'
import { createPrayerRequest, fetchPrayerAccess } from '@/services/prayer/requests'
import './Prayer.css'

function PrayerWritePage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(EMPTY_PRAYER_DRAFT)
  const [access, setAccess] = useState({ canViewPrivate: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [privateDone, setPrivateDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadAccess() {
      const result = await fetchPrayerAccess()

      if (!cancelled && result.success) {
        setAccess(result.access)
      }
    }

    void loadAccess()

    return () => {
      cancelled = true
    }
  }, [])

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

    if (draft.visibility === 'private' && !access.canViewPrivate) {
      setPrivateDone(true)
      return
    }

    navigate(prayerDetailPath(result.id), { replace: true })
  }

  return (
    <PrayerCopyGuard>
      <div className="prayer-page">
        <PrayerHero matchMain image={prayerWriteHeroImage} title="기도 제목 작성" />
        <div className="prayer-page__inner">
          {privateDone ? (
            <div className="prayer-panel">
              <h2>비공개로 전해졌습니다.</h2>
              <p>일반 회원은 이 글을 다시 볼 수 없습니다.</p>
              <Link className="prayer-button" to={PRAYER_PATH}>
                기도 나눔으로
              </Link>
            </div>
          ) : (
            <PrayerForm
              draft={draft}
              onChange={setDraft}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              submitLabel="기도 제목 올리기"
            />
          )}
        </div>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerWritePage
