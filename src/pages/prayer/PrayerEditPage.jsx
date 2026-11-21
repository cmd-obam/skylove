import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerForm from '@/components/prayer/PrayerForm'
import PrayerHero from '@/components/prayer/PrayerHero'
import { PRAYER_PATH, prayerDetailPath } from '@/data/prayerMenu'
import { validatePrayerDraft } from '@/services/prayer/present'
import { fetchPrayerRequest, updatePrayerRequest } from '@/services/prayer/requests'
import './Prayer.css'

function PrayerEditPage() {
  const { prayerId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await fetchPrayerRequest(prayerId)

      if (cancelled) {
        return
      }

      if (!result.success) {
        setMessage(result.message)
        setLoading(false)
        return
      }

      if (!result.prayer.canEdit) {
        setMessage('이 기도 제목을 수정할 권한이 없습니다.')
        setLoading(false)
        return
      }

      setDraft({
        category: result.prayer.category,
        title: result.prayer.title,
        content: result.prayer.content,
        isAnonymous: result.prayer.isAnonymous,
        visibility: result.prayer.visibility,
        status: result.prayer.status,
      })
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [prayerId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validation = validatePrayerDraft(draft)

    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')
    const result = await updatePrayerRequest(prayerId, draft)
    setSubmitting(false)

    if (!result.success) {
      setError(result.message)
      return
    }

    if (draft.visibility === 'private') {
      navigate(PRAYER_PATH, { replace: true })
      return
    }

    navigate(prayerDetailPath(prayerId), { replace: true })
  }

  return (
    <PrayerCopyGuard>
      <div className="prayer-page">
        <PrayerHero compact title="기도 제목 수정" />
        <div className="prayer-page__inner">
          <Link className="prayer-back" to={PRAYER_PATH}>
            기도 나눔으로
          </Link>
          {loading ? <p className="prayer-status">기도 제목을 불러오는 중입니다.</p> : null}
          {message ? <p className="prayer-status prayer-status--error">{message}</p> : null}
          {draft ? (
            <PrayerForm
              draft={draft}
              onChange={setDraft}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              submitLabel="수정 내용 저장"
              showStatus
            />
          ) : null}
        </div>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerEditPage
