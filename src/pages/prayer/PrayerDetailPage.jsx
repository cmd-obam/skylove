import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Modal from '@/components/common/Modal'
import PrayerCopyGuard from '@/components/prayer/PrayerCopyGuard'
import PrayerHero from '@/components/prayer/PrayerHero'
import { PRAYER_PATH, prayerEditPath } from '@/data/prayerMenu'
import {
  formatPrayerDate,
  parsePrayerCardSelection,
  prayerAuthorLabel,
  prayerCategoryLabel,
  prayerStatusLabel,
  prayerVisibilityLabel,
} from '@/services/prayer/present'
import {
  deletePrayerRequest,
  fetchPrayerParticipants,
  fetchPrayerRequest,
  savePrayerParticipation,
  setPrayerStatus,
  togglePrayerParticipation,
} from '@/services/prayer/requests'
import './Prayer.css'

const COMMENT_CATEGORIES = new Set(['personal', 'church', 'mission'])
const TOGETHER_CATEGORIES = new Set([
  'intercession',
  'spirit',
  'health',
  'identity',
  'path',
  'family',
  'other',
])

function prayerNoteKind(category) {
  if (TOGETHER_CATEGORIES.has(category)) {
    return 'together'
  }

  if (COMMENT_CATEGORIES.has(category)) {
    return 'comment'
  }

  return null
}

function PrayerDetailPage() {
  const { prayerId } = useParams()
  const navigate = useNavigate()
  const [prayer, setPrayer] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [joining, setJoining] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantMessage, setParticipantMessage] = useState('')
  const [composing, setComposing] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const noteRef = useRef(null)

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

      if (prayerNoteKind(result.prayer.category) || result.prayer.canDelete) {
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

  const handleAnswer = async () => {
    setPending(true)
    const result = await setPrayerStatus(prayer.id, 'answered')
    setPending(false)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    navigate(PRAYER_PATH, { replace: true, state: { board: 'answered' } })
  }

  const openComposer = () => {
    const mine = participants.find((person) => person.isMine)
    setNote(mine?.message || '')
    setParticipantMessage('')
    setComposing(true)
  }

  useEffect(() => {
    if (!composing) {
      return
    }

    noteRef.current?.focus()
    noteRef.current?.scrollIntoView({ block: 'nearest' })
  }, [composing])

  const handlePray = async (event) => {
    event.preventDefault()
    const text = note.trim()

    if (!text) {
      setParticipantMessage(prayerNoteKind(prayer.category) === 'comment' ? '댓글을 적어 주세요.' : '기도를 적어 주세요.')
      return
    }

    setSavingNote(true)
    const result = await savePrayerParticipation(prayer.id, text)
    setSavingNote(false)

    if (!result.success) {
      setParticipantMessage(result.message)
      return
    }

    const people = await fetchPrayerParticipants(prayer.id)

    if (!people.success) {
      setParticipantMessage(people.message)
      return
    }

    setParticipants(people.participants)
    setComposing(false)
    setNote('')
    setParticipantMessage('')
  }

  const handleJoin = async () => {
    setJoining(true)
    const result = await togglePrayerParticipation(prayer.id)
    setJoining(false)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    setPrayer((current) =>
      current
        ? {
            ...current,
            viewerParticipating: result.participating,
            participantCount: Math.max(0, current.participantCount + (result.participating ? 1 : -1)),
          }
        : current,
    )
  }

  const handleDelete = async () => {
    const result = await deletePrayerRequest(prayer.id)

    if (!result.success) {
      setMessage(result.message)
      return
    }

    navigate(PRAYER_PATH, { replace: true })
  }

  const noteKind = prayerNoteKind(prayer?.category)
  const isComment = noteKind === 'comment'
  const categoryBadges = prayer
    ? (() => {
        const selection = parsePrayerCardSelection(prayer.title, prayer.category)

        if (selection.cardIds.length === 0) {
          return [prayerCategoryLabel(prayer.category)]
        }

        return selection.cardIds.map((id) =>
          id === 'other' && selection.otherText ? selection.otherText : prayerCategoryLabel(id),
        )
      })()
    : []
  const notes = participants.filter((person) => person.message)
  const showTogetherForm = noteKind === 'together' && prayer && !prayer.isOwner && prayer.status !== 'answered'

  return (
    <PrayerCopyGuard>
      <div className="prayer-page">
        <PrayerHero title="중보기도" />
        <div className="prayer-page__inner">
          {status === 'loading' ? <p className="prayer-status">기도 제목을 불러오는 중입니다.</p> : null}
          {status === 'error' ? <p className="prayer-status prayer-status--error">{message}</p> : null}
          {status === 'ready' && prayer ? (
            <article className={`prayer-detail${prayer.status === 'answered' ? ' prayer-card--answered' : ''}`}>
              <div className="prayer-detail__tags">
                {categoryBadges.map((label, index) => (
                  <span key={`${label}-${index}`} className="prayer-tag">{label}</span>
                ))}
                <span className={`prayer-tag prayer-tag--${prayer.status}`}>
                  {prayerStatusLabel(prayer.status)}
                </span>
                <span className={`prayer-tag${prayer.visibility === 'private' ? ' prayer-tag--private' : ''}`}>
                  {prayerVisibilityLabel(prayer.visibility)}
                </span>
              </div>
              <div className="prayer-detail__title-row">
                <div className="prayer-detail__heading">
                  <h2 className="prayer-detail__title">{prayer.title}</h2>
                  <p className="prayer-detail__meta">
                    <span>{prayerAuthorLabel(prayer)}</span>
                    <span>{formatPrayerDate(prayer.createdAt)}</span>
                  </p>
                </div>
                <div className="prayer-detail__toolbar">
                  {prayer.canEdit || prayer.isOwner ? (
                    <Link className="prayer-detail__tool" to={prayerEditPath(prayer.id)}>
                      수정
                    </Link>
                  ) : null}
                  <Link className="prayer-detail__tool" to={PRAYER_PATH}>
                    목록
                  </Link>
                  {prayer.canDelete ? (
                    <button
                      type="button"
                      className="prayer-detail__tool prayer-detail__tool--danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      삭제
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="prayer-detail__content">{prayer.content}</p>
              {message ? <p className="prayer-status prayer-status--error">{message}</p> : null}
              {prayer.isOwner && prayer.status !== 'answered' ? (
                <div className="prayer-detail__answer">
                  <button
                    type="button"
                    className="prayer-button prayer-detail__answer-button"
                    disabled={pending}
                    onClick={handleAnswer}
                  >
                    {pending ? '옮기는 중' : '응답 완료'}
                  </button>
                </div>
              ) : null}
              {noteKind === 'together' ? (
                <div className="prayer-detail__answer">
                  <button
                    type="button"
                    className={`prayer-join${prayer.viewerParticipating ? ' is-active' : ''}`}
                    aria-pressed={prayer.viewerParticipating}
                    disabled={joining || prayer.status === 'answered'}
                    onClick={handleJoin}
                  >
                    {joining
                      ? '반영하는 중'
                      : `${prayer.viewerParticipating ? '🙏 함께 기도했어요' : '🙏 함께 기도하기'} ${prayer.participantCount}`}
                  </button>
                </div>
              ) : null}
              {isComment && !prayer.isOwner && prayer.status !== 'answered' ? (
                <div className="prayer-detail__answer">
                  <button type="button" className="prayer-button prayer-detail__answer-button" onClick={openComposer}>
                    댓글달기
                  </button>
                </div>
              ) : null}
              {noteKind || prayer.canDelete ? (
                <section className="prayer-manage prayer-manage--admin" aria-label={isComment ? '댓글' : '기도 참여 내역'}>
                  <h4 className="prayer-manage__subhead prayer-manage__subhead--first">
                    {isComment ? '댓글' : '기도 참여 내역'}
                  </h4>
                  {composing || showTogetherForm ? (
                    <form className="prayer-pray-form" onSubmit={handlePray}>
                      <label className="prayer-field">
                        {isComment ? '댓글' : '함께 드리는 기도'}
                        <textarea
                          ref={noteRef}
                          value={note}
                          rows={4}
                          maxLength={500}
                          placeholder={
                            isComment
                              ? '댓글을 적어 주세요.'
                              : '함께 나누고 싶은 기도와 격려의 메시지를 작성해 주세요.'
                          }
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      <div className="prayer-pray-form__actions">
                        <button
                          type="button"
                          className="prayer-button prayer-button--ghost"
                          onClick={() => {
                            setComposing(false)
                            setNote('')
                          }}
                        >
                          취소
                        </button>
                        <button type="submit" className="prayer-button" disabled={savingNote}>
                          {savingNote ? '남기는 중' : isComment ? '댓글 남기기' : '기도 남기기'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {participantMessage ? (
                    <p className="prayer-status prayer-status--error">{participantMessage}</p>
                  ) : null}
                  {notes.length === 0 && !composing && !showTogetherForm ? (
                    <p className="prayer-status">
                      {isComment ? '아직 댓글이 없습니다.' : '아직 참여한 회원이 없습니다.'}
                    </p>
                  ) : null}
                  {notes.length > 0 ? (
                    <ul className="prayer-participants">
                      {notes.map((person) => (
                        <li key={person.userId}>
                          <div className="prayer-participants__meta">
                            <span>{person.displayName}</span>
                            <span>{formatPrayerDate(person.createdAt)}</span>
                          </div>
                          {person.message ? (
                            <p className="prayer-participants__message">{person.message}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
