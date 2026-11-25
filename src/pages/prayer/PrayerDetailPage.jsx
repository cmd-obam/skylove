import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import heroImage from '@/assets/images/intercession/1.png'
import PrayerHero from '@/components/prayer/PrayerHero'
import PrayerParticipateButton from '@/components/prayer/PrayerParticipateButton'
import { PRAYER_PATH, prayerEditPath } from '@/data/prayerMenu'
import {
  formatPrayerDate,
  prayerAuthorLabel,
  prayerCategoryLabel,
  prayerStatusLabel,
  prayerVisibilityLabel,
} from '@/services/prayer/present'
import {
  deletePrayerRequest,
  fetchPrayerParticipants,
  fetchPrayerRequest,
  setPrayerStatus,
  togglePrayerParticipation,
} from '@/services/prayer/requests'
import './Prayer.css'

function PrayerDetailPage() {
  const { prayerId } = useParams()
  const navigate = useNavigate()
  const [prayer, setPrayer] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantMessage, setParticipantMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      const result = await fetchPrayerRequest(prayerId)

      if (cancelled) {
        return
      }

      if (!result.success) {
        setPrayer(null)
        setStatus('error')
        setMessage(result.message)
        return
      }

      setPrayer(result.prayer)
      setStatus('ready')

      if (result.prayer.canDelete) {
        const people = await fetchPrayerParticipants(prayerId)

        if (cancelled) {
          return
        }

        if (people.success) {
          setParticipants(people.participants)
          setParticipantMessage('')
        } else {
          setParticipantMessage(people.message)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [prayerId])

  const handleToggle = async () => {
    setPending(true)
    const result = await togglePrayerParticipation(prayer.id)
    setPending(false)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    const delta = result.participating === prayer.viewerParticipating ? 0 : result.participating ? 1 : -1
    setPrayer((current) => ({
      ...current,
      viewerParticipating: result.participating,
      participantCount: Math.max(0, current.participantCount + delta),
    }))
  }

  const handleStatus = async (nextStatus) => {
    setPending(true)
    const result = await setPrayerStatus(prayer.id, nextStatus)
    setPending(false)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    setPrayer((current) => ({ ...current, status: result.status }))
  }

  const handleDelete = async () => {
    const result = await deletePrayerRequest(prayer.id)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    navigate(PRAYER_PATH, { replace: true })
  }

  return (
    <PrayerCopyGuard>
      <div className="prayer-page">
        <PrayerHero compact image={heroImage} eyebrow={false} title="중보기도" />
        <div className="prayer-page__inner">
          {status === 'loading' ? <p className="prayer-status">기도 제목을 불러오는 중입니다.</p> : null}
          {status === 'error' ? <p className="prayer-status prayer-status--error">{message}</p> : null}
          {status === 'ready' && prayer ? (
            <article className={`prayer-detail${prayer.status === 'answered' ? ' prayer-card--answered' : ''}`}>
              <div className="prayer-detail__tags">
                <span className="prayer-tag">{prayerCategoryLabel(prayer.category)}</span>
                <span className={`prayer-tag prayer-tag--${prayer.status}`}>
                  {prayerStatusLabel(prayer.status)}
                </span>
                <span className={`prayer-tag${prayer.visibility === 'private' ? ' prayer-tag--private' : ''}`}>
                  {prayerVisibilityLabel(prayer.visibility)}
                </span>
              </div>
              <h2 className="prayer-detail__title">{prayer.title}</h2>
              <p className="prayer-detail__meta">
                <span>{prayerAuthorLabel(prayer)}</span>
                <span>{formatPrayerDate(prayer.createdAt)}</span>
                <span>함께 기도 {prayer.participantCount}명</span>
              </p>
              <p className="prayer-detail__content">{prayer.content}</p>
              {message ? <p className="prayer-status prayer-status--error">{message}</p> : null}
              <div className="prayer-detail__pray">
                <PrayerParticipateButton
                  participating={prayer.viewerParticipating}
                  pending={pending}
                  onToggle={handleToggle}
                />
              </div>
              {prayer.canEdit || prayer.canChangeStatus ? (
                <section className="prayer-manage">
                  <header className="prayer-manage__head">
                    <h3>기도 제목 관리</h3>
                    <p>작성자와 권한이 있는 사람에게만 보입니다.</p>
                  </header>
                  <div className="prayer-manage__actions">
                    {prayer.canEdit ? (
                      <Link className="prayer-button prayer-button--ghost" to={prayerEditPath(prayer.id)}>
                        수정
                      </Link>
                    ) : null}
                    {prayer.canChangeStatus ? (
                      <>
                        <button
                          type="button"
                          className="prayer-button prayer-button--ghost"
                          disabled={pending || prayer.status === 'praying'}
                          onClick={() => handleStatus('praying')}
                        >
                          기도 중으로 표시
                        </button>
                        <button
                          type="button"
                          className="prayer-button prayer-button--ghost"
                          disabled={pending || prayer.status === 'answered'}
                          onClick={() => handleStatus('answered')}
                        >
                          응답 완료로 표시
                        </button>
                      </>
                    ) : null}
                  </div>
                </section>
              ) : null}
              {prayer.canDelete ? (
                <section className="prayer-manage prayer-manage--admin">
                  <div className="prayer-manage__actions">
                    <button type="button" className="prayer-button prayer-button--danger" onClick={() => setConfirmDelete(true)}>
                      삭제
                    </button>
                  </div>
                  <h4 className="prayer-manage__subhead">기도 참여 내역</h4>
                  {participantMessage ? (
                    <p className="prayer-status prayer-status--error">{participantMessage}</p>
                  ) : null}
                  {participants.length === 0 ? (
                    <p className="prayer-status">아직 참여한 회원이 없습니다.</p>
                  ) : (
                    <ul className="prayer-participants">
                      {participants.map((person) => (
                        <li key={person.userId}>
                          <span>{person.displayName}</span>
                          <span>{formatPrayerDate(person.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </article>
          ) : null}
        </div>
        <Modal isOpen={confirmDelete} title="기도 제목을 삭제할까요?" onClose={() => setConfirmDelete(false)}>
          <p>기도 제목과 참여 기록을 삭제합니다.</p>
          <div className="prayer-inline-actions">
            <button type="button" className="prayer-button prayer-button--danger" onClick={handleDelete}>
              삭제
            </button>
            <button type="button" className="prayer-button prayer-button--ghost" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </div>
        </Modal>
      </div>
    </PrayerCopyGuard>
  )
}

export default PrayerDetailPage
