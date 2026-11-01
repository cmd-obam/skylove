import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSuperAdminRole } from '@/services/auth/roles'
import {
  fetchMyThanksgivingGameScore,
  fetchThanksgivingGameRanking,
  getOrCreateGuestKey,
  sliceRankingPage,
} from '@/services/thanksgivingGame/scores'
import medalGoldSrc from '@/assets/images/thanksgiving-game/medal-gold.png'
import medalSilverSrc from '@/assets/images/thanksgiving-game/medal-silver.png'
import medalBronzeSrc from '@/assets/images/thanksgiving-game/medal-bronze.png'
import bgFieldSrc from '@/assets/images/thanksgiving-game/bg-field.png'
import './ThanksgivingGame.css'

const MEDAL_SRC = {
  gold: medalGoldSrc,
  silver: medalSilverSrc,
  bronze: medalBronzeSrc,
}

const RANKING_FETCH_LIMIT = 100

function RankName({ row, showGuestKind = false }) {
  return (
    <span className="tg-rank__name">
      <span>{row.displayName}</span>
      {showGuestKind && row.playerKind === 'guest' ? (
        <span className="tg-rank__kind">비회원</span>
      ) : null}
    </span>
  )
}

function getMedalTier(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return null
}

function RankPlace({ rank }) {
  const medal = getMedalTier(Number(rank))
  const medalLabel =
    medal === 'gold' ? '금메달' : medal === 'silver' ? '은메달' : medal === 'bronze' ? '동메달' : null
  return (
    <span className="tg-rank__place">
      {medal ? (
        <img
          src={MEDAL_SRC[medal]}
          alt=""
          aria-hidden="true"
          title={medalLabel}
          className="tg-rank__medal-img"
        />
      ) : (
        <span className="tg-rank__medal-img tg-rank__medal-img--spacer" aria-hidden="true" />
      )}
      <span>{rank}위</span>
    </span>
  )
}

function RankingBoard({ rows, status, highlightMe, showGuestKind, errorText }) {
  const [page, setPage] = useState(1)
  const paged = sliceRankingPage(rows, page)
  const visibleRows = status === 'ready' ? paged.rows : []

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page)
  }, [page, paged.page])

  return (
    <div className="tg-rank">
      <h3 className="tg-rank__title">전체 랭킹</h3>
      {status === 'loading' ? <p className="tg-card__text">랭킹을 불러오는 중…</p> : null}
      {status === 'error' ? <p className="tg-card__text">{errorText}</p> : null}
      {status === 'empty' ? <p className="tg-card__text">아직 등록된 기록이 없습니다.</p> : null}
      {status === 'ready' ? (
        <ol className="tg-rank__list">
          {visibleRows.map((row) => (
            <li
              key={row.entryId ?? `${row.rank}-${row.displayName}`}
              className={highlightMe(row) ? 'tg-rank__item tg-rank__item--me' : 'tg-rank__item'}
            >
              <RankPlace rank={row.rank} />
              <RankName row={row} showGuestKind={showGuestKind} />
              <span className="tg-rank__score">{row.bestScore}점</span>
            </li>
          ))}
        </ol>
      ) : null}
      {status === 'ready' && paged.pageCount > 1 ? (
        <div className="tg-rank__pager" role="navigation" aria-label="랭킹 페이지">
          <button
            type="button"
            className="tg-btn tg-btn--ghost"
            disabled={paged.page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            이전
          </button>
          <span className="tg-rank__pager-status" aria-live="polite">
            {paged.page} / {paged.pageCount}
          </span>
          <button
            type="button"
            className="tg-btn tg-btn--ghost"
            disabled={paged.page >= paged.pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            다음
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ThanksgivingGame() {
  const navigate = useNavigate()
  const { isLoggedIn, effectiveUserId, profile } = useAuth()
  const showGuestKind = isLoggedIn && isSuperAdminRole(profile?.role)
  const guestKey = useMemo(() => getOrCreateGuestKey(), [])

  const [rankingOpen, setRankingOpen] = useState(false)
  const [rankingRows, setRankingRows] = useState([])
  const [rankingStatus, setRankingStatus] = useState('idle')
  const [myBest, setMyBest] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [myEntryId, setMyEntryId] = useState(null)

  const loadRanking = useCallback(async () => {
    setRankingStatus('loading')
    const [rankingResult, myResult] = await Promise.all([
      fetchThanksgivingGameRanking(RANKING_FETCH_LIMIT),
      fetchMyThanksgivingGameScore({ guestKey }),
    ])

    if (rankingResult.success) {
      setRankingRows(rankingResult.rows)
      setRankingStatus(rankingResult.rows.length ? 'ready' : 'empty')
    } else {
      setRankingRows([])
      setRankingStatus('error')
    }

    if (myResult.success) {
      setMyBest(myResult.bestScore)
      setMyRank(myResult.rank)
      setMyEntryId(myResult.entryId)
    }
  }, [guestKey])

  const openRanking = useCallback(async () => {
    setRankingOpen(true)
    await loadRanking()
  }, [loadRanking])

  const highlightMe = useMemo(
    () => (row) =>
      (myEntryId && row.entryId === myEntryId) ||
      (isLoggedIn && row.userId && row.userId === effectiveUserId) ||
      (!isLoggedIn && guestKey && row.guestKey === guestKey),
    [effectiveUserId, guestKey, isLoggedIn, myEntryId],
  )

  return (
    <div className="tg-page">
      <div className="tg-page__inner">
        <div className="tg-stage tg-stage--pregame tg-stage--coming-soon">
          <div
            className="tg-coming-soon"
            style={{ backgroundImage: `url(${bgFieldSrc})` }}
          >
            <div className="tg-coming-soon__panel">
              <p className="tg-coming-soon__label">Coming Soon</p>
              <button
                type="button"
                className="tg-btn tg-btn--primary tg-coming-soon__cta"
                onClick={openRanking}
              >
                추수게임 랭킹보기
              </button>
            </div>
          </div>

          {rankingOpen ? (
            <div className="tg-overlay tg-overlay--ranking">
              <div className="tg-card tg-card--ranking tg-card--ended">
                <h2 className="tg-card__title">추수게임 랭킹</h2>
                <p className="tg-card__text">이벤트 기간이 종료되었습니다. 최종 랭킹을 확인할 수 있습니다.</p>
                <p className="tg-card__text">
                  개인 최고 점수: {myBest == null ? '-' : `${myBest}점`}
                  {myRank != null ? ` · 내 순위 ${myRank}위` : ''}
                </p>
                <RankingBoard
                  rows={rankingRows}
                  status={rankingStatus}
                  highlightMe={highlightMe}
                  showGuestKind={showGuestKind}
                  errorText="랭킹을 불러오지 못했습니다."
                />
                <div className="tg-card__actions">
                  <button
                    type="button"
                    className="tg-btn tg-btn--ghost"
                    onClick={() => setRankingOpen(false)}
                  >
                    닫기
                  </button>
                  <button type="button" className="tg-btn tg-btn--ghost" onClick={() => navigate('/')}>
                    홈으로
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ThanksgivingGame
