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
  deletePrayerParticipation,
  deletePrayerRequest,
  fetchPrayerParticipants,
  fetchPrayerRequest,
  savePrayerParticipation,
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
  const [joining, setJoining] = useState(false)
  const [participants, setParticipants] = useState([])
  const [participantMessage, setParticipantMessage] = useState('')
  const [composing, setComposing] = useState(false)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuUserId, setMenuUserId] = useState(null)
  const [editingNote, setEditingNote] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState(null)
  const noteRef = useRef(null)
  const menuRef = useRef(null)

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

  const openComposer = () => {
    const mine = participants.find((person) => person.isMine)
    setNote(mine?.message || '')
    setParticipantMessage('')
    setComposing(true)
  }

  useEffect(() => {
    if (!composing && !editingNote) {
      return
    }

    noteRef.current?.focus()
    noteRef.current?.scrollIntoView({ block: 'nearest' })
  }, [composing, editingNote])

  useEffect(() => {
    if (!menuUserId) {
      return undefined
    }

    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuUserId(null)
      }
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuUserId])

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
    setEditingNote(false)
    setNote('')
    setParticipantMessage('')
  }

  const handleDeleteNote = async () => {
    if (!noteToDelete) {
      return
    }

    setSavingNote(true)
    const result = await deletePrayerParticipation(prayer.id, noteToDelete.userId)
    setSavingNote(false)

    if (!result.success) {
      setParticipantMessage(result.message)
      setNoteToDelete(null)
      return
    }

    const people = await fetchPrayerParticipants(prayer.id)
    if (people.success) {
      setParticipants(people.participants)
    }
    if (noteToDelete.isMine) {
      setNote('')
      setEditingNote(false)
    }
    setNoteToDelete(null)
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
  const showTogetherForm = noteKind === 'together' && prayer && prayer.status !== 'answered'

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
              {noteKind === 'together' ? (
                <div className="prayer-detail__answer">
                  <button
                    type="button"
                    className={`prayer-join${prayer.viewerParticipating ? ' is-active' : ''}`}
                    aria-pressed={prayer.viewerParticipating}
                    disabled={joining || prayer.status === 'answered'}
                    onClick={handleJoin}
                  >
                    <svg className="prayer-join__heart" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path d="M12 19.4c-.3 0-6.6-4.1-6.6-8.7C5.4 8.2 7.2 6.6 9.3 6.6c1.2 0 2.2.6 2.7 1.5.5-.9 1.5-1.5 2.7-1.5 2.1 0 3.9 1.6 3.9 4.1 0 4.6-6.3 8.7-6.6 8.7z" />
                    </svg>
                    {joining ? '반영하는 중' : `함께 기도하기 ${prayer.participantCount}`}
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
              {noteKind === 'together' ? (
                <section className="prayer-notes" aria-label="기도 참여 내역">
                  <h4>기도 참여 내역</h4>
                  <p className="prayer-notes__lead">함께 기도하며 격려의 메시지를 나눠보세요.</p>
                  {showTogetherForm ? (
                    <form className="prayer-notes__form" onSubmit={handlePray}>
                      <label>
                        함께 드리는 기도
                        <textarea
                          ref={noteRef}
                          value={note}
                          rows={4}
                          maxLength={500}
                          placeholder="함께 나누고 싶은 기도와 격려의 메시지를 작성해 주세요."
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      <div className="prayer-notes__actions">
                        <button
                          type="button"
                          className="prayer-note-button"
                          onClick={() => {
                            setNote('')
                            setEditingNote(false)
                          }}
                        >
                          취소
                        </button>
                        <button type="submit" className="prayer-note-button prayer-note-button--submit" disabled={savingNote}>
                          {savingNote ? '남기는 중' : editingNote ? '수정하기' : '기도 남기기'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {participantMessage ? <p className="prayer-status prayer-status--error">{participantMessage}</p> : null}
                  {notes.length > 0 ? (
                    <ul className="prayer-notes__list">
                      {notes.map((person) => {
                        const canEdit = person.isMine && prayer.status !== 'answered'
                        const canRemove = (person.isMine || prayer.canDelete) && prayer.status !== 'answered'
                        return (
                          <li key={person.userId} className={person.staffLabel ? 'prayer-note prayer-note--staff' : 'prayer-note'}>
                            <div className="prayer-note__head">
                              <span className="prayer-note__avatar" aria-hidden="true">
                                {person.staffLabel ? (
                                  <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M5 16.5 3.2 8.6l4.3 3.2L12 6.2l4.5 5.6 4.3-3.2L19 16.5H5z" />
                                  </svg>
                                ) : (
                                  person.displayName.slice(0, 1)
                                )}
                              </span>
                              <span className="prayer-note__name">{person.displayName}</span>
                              {person.staffLabel ? <span className="prayer-note__badge">{person.staffLabel}</span> : null}
                              <span className="prayer-note__date">
                                {formatPrayerDate(person.createdAt)}
                                {person.edited ? ' (수정됨)' : ''}
                              </span>
                              {canEdit || canRemove ? (
                                <div className="prayer-note__menu" ref={menuUserId === person.userId ? menuRef : null}>
                                  <button
                                    type="button"
                                    className="prayer-note__more"
                                    aria-label="기도 글 메뉴"
                                    aria-expanded={menuUserId === person.userId}
                                    onClick={() => setMenuUserId((current) => (current === person.userId ? null : person.userId))}
                                  >
                                    ···
                                  </button>
                                  {menuUserId === person.userId ? (
                                    <div className="prayer-note__popover" role="menu">
                                      {canEdit ? (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            setNote(person.message)
                                            setEditingNote(true)
                                            setMenuUserId(null)
                                            setParticipantMessage('')
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                                            <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5z" />
                                          </svg>
                                          수정
                                        </button>
                                      ) : null}
                                      {canRemove ? (
                                        <button
                                          type="button"
                                          role="menuitem"
                                          className="is-danger"
                                          onClick={() => {
                                            setMenuUserId(null)
                                            setNoteToDelete(person)
                                          }}
                                        >
                                          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                                            <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M5 7h14M9 7V5h6v2m-7 0 1 12h6l1-12" />
                                          </svg>
                                          삭제
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <p className="prayer-note__body">{person.message}</p>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </section>
              ) : null}
              {isComment || (prayer.canDelete && noteKind !== 'together') ? (
                <section className="prayer-manage prayer-manage--admin" aria-label="댓글">
                  <h4 className="prayer-manage__subhead prayer-manage__subhead--first">댓글</h4>
                  {composing ? (
                    <form className="prayer-pray-form" onSubmit={handlePray}>
                      <label className="prayer-field">
                        댓글
                        <textarea
                          ref={isComment ? noteRef : null}
                          value={note}
                          rows={4}
                          maxLength={500}
                          placeholder="댓글을 적어 주세요."
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
                          {savingNote ? '남기는 중' : '댓글 남기기'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {participantMessage && isComment ? (
                    <p className="prayer-status prayer-status--error">{participantMessage}</p>
                  ) : null}
                  {notes.length === 0 && !composing ? <p className="prayer-status">아직 댓글이 없습니다.</p> : null}
                  {notes.length > 0 ? (
                    <ul className="prayer-participants">
                      {notes.map((person) => (
                        <li key={person.userId}>
                          <div className="prayer-participants__meta">
                            <span>{person.displayName}</span>
                            <span>{formatPrayerDate(person.createdAt)}</span>
                          </div>
                          {person.message ? <p className="prayer-participants__message">{person.message}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
            </article>
          ) : null}
        </div>
        <Modal isOpen={Boolean(noteToDelete)} title="남긴 기도를 삭제할까요?" onClose={() => setNoteToDelete(null)}>
          <p>삭제하면 이 기도 글은 참여 내역에서 사라집니다.</p>
          <div className="prayer-inline-actions">
            <button type="button" className="prayer-button prayer-button--danger" onClick={handleDeleteNote} disabled={savingNote}>
              삭제
            </button>
            <button type="button" className="prayer-button prayer-button--ghost" onClick={() => setNoteToDelete(null)}>
              취소
            </button>
          </div>
        </Modal>
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
