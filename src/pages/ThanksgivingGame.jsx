import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getPublicDisplayName } from '@/utils/getPublicDisplayName'
import {
  fetchMyThanksgivingGameScore,
  fetchThanksgivingGameRanking,
  getOrCreateGuestKey,
  submitThanksgivingGameScore,
  validateGameNickname,
} from '@/services/thanksgivingGame/scores'
import farmerSrc from '@/assets/images/thanksgiving-game/farmer.png'
import riceSrc from '@/assets/images/thanksgiving-game/rice.png'
import goldenRiceSrc from '@/assets/images/thanksgiving-game/golden-rice.png'
import weedSrc from '@/assets/images/thanksgiving-game/weed.png'
import heartSrc from '@/assets/images/thanksgiving-game/heart.png'
import brokenHeartSrc from '@/assets/images/thanksgiving-game/broken-heart.png'
import './ThanksgivingGame.css'

const INITIAL_LIVES = 3
const GAME_DURATION_MS = 60_000
const BASE_FALL_SPEED = 140
const FARMER_SPEED = 320
const MAX_COMBO_POINTS = 5
const GOLDEN_PER_ROUND = 5
const GOLDEN_MIN_GAP_MS = 9_000
const GOLDEN_EARLIEST_MS = 4_000
const GOLDEN_LATEST_MS = 52_000
const NICKNAME_STORAGE_KEY = 'skylove:tg-game:last-nickname'

/** Combo 1–10 → 1pt, 11–20 → 2pt, … capped at 5. */
function getComboPoints(comboCount) {
  if (comboCount < 1) return 1
  return Math.min(MAX_COMBO_POINTS, Math.floor((comboCount - 1) / 10) + 1)
}

/** Golden rice: combo tiers → 5 / 10 / 15 / 20 / 25. */
function getGoldenComboPoints(comboCount) {
  return getComboPoints(comboCount) * 5
}

/** 5 random spawn times in 1 minute, never back-to-back. */
function makeGoldenSpawnTimes() {
  const windowSize = (GOLDEN_LATEST_MS - GOLDEN_EARLIEST_MS) / GOLDEN_PER_ROUND
  const times = []
  for (let i = 0; i < GOLDEN_PER_ROUND; i += 1) {
    const windowStart = GOLDEN_EARLIEST_MS + i * windowSize
    const windowEnd = windowStart + windowSize - 500
    const minStart = times.length ? times[times.length - 1] + GOLDEN_MIN_GAP_MS : windowStart
    const lo = Math.min(Math.max(windowStart, minStart), windowEnd - 200)
    const hi = Math.max(lo + 200, windowEnd)
    times.push(lo + Math.random() * (hi - lo))
  }
  return times
}

/** 10s → 1.5x, 30s → 2x fall speed. */
function getSpeedMultiplier(elapsedSec) {
  if (elapsedSec >= 30) return 2.0
  if (elapsedSec >= 10) return 1.5
  return 1.0
}

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

function readStoredNickname() {
  try {
    return String(window.localStorage.getItem(NICKNAME_STORAGE_KEY) ?? '').trim()
  } catch {
    return ''
  }
}

function storeNickname(value) {
  try {
    window.localStorage.setItem(NICKNAME_STORAGE_KEY, value)
  } catch {
    // ignore
  }
}

function getDefaultNickname(profile, isLoggedIn) {
  if (isLoggedIn && profile) {
    const fromProfile = getPublicDisplayName(profile, { fallback: '' })
    if (fromProfile) return fromProfile.slice(0, 12)
    const username = String(profile.username ?? '').trim()
    if (username) return username.slice(0, 12)
  }
  return readStoredNickname().slice(0, 12)
}

function getMedalTier(rank) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return null
}

function RankPlace({ rank }) {
  const medal = getMedalTier(Number(rank))
  return (
    <span className="tg-rank__place">
      {medal ? (
        <span
          className={`tg-rank__medal tg-rank__medal--${medal}`}
          aria-hidden="true"
          title={medal === 'gold' ? '금메달' : medal === 'silver' ? '은메달' : '동메달'}
        />
      ) : (
        <span className="tg-rank__medal tg-rank__medal--spacer" aria-hidden="true" />
      )}
      <span>{rank}위</span>
    </span>
  )
}

function ThanksgivingGame() {
  const navigate = useNavigate()
  const { isLoggedIn, effectiveUserId, profile } = useAuth()
  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const rafRef = useRef(0)
  const imagesRef = useRef({
    farmer: null,
    rice: null,
    goldenRice: null,
    weed: null,
    brokenHeart: null,
  })
  const stateRef = useRef(null)
  const fxSeqRef = useRef(0)
  const touchRef = useRef({ active: false, offsetX: 0 })
  const nicknameRef = useRef('')
  const guestKeyRef = useRef(getOrCreateGuestKey())

  const [phase, setPhase] = useState('intro')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [lives, setLives] = useState(INITIAL_LIVES)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [rankingRows, setRankingRows] = useState([])
  const [rankingStatus, setRankingStatus] = useState('idle')
  const [rankingOpen, setRankingOpen] = useState(false)
  const rankingResumeRef = useRef(false)
  const [myBest, setMyBest] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [myEntryId, setMyEntryId] = useState(null)
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [nickname, setNickname] = useState(() => getDefaultNickname(profile, isLoggedIn))
  const [nicknameError, setNicknameError] = useState('')

  useEffect(() => {
    nicknameRef.current = nickname
  }, [nickname])

  useEffect(() => {
    if (phase !== 'intro' && phase !== 'tutorial' && phase !== 'nickname') return
    const next = getDefaultNickname(profile, isLoggedIn)
    if (!nickname.trim() && next) {
      setNickname(next)
    }
  }, [isLoggedIn, profile, phase, nickname])

  const syncHud = useCallback((game) => {
    setScore(game.score)
    setCombo(game.combo ?? 0)
    setLives(game.lives)
    setElapsedMs(game.elapsedMs)
    setPhase(game.phase)
  }, [])

  const createFreshState = useCallback(
    (width, height) => ({
      phase: 'playing',
      score: 0,
      combo: 0,
      lives: INITIAL_LIVES,
      elapsedMs: 0,
      farmerX: width / 2,
      items: [],
      fx: [],
      nextSpawnAt: 400,
      itemSeq: 0,
      lastSpawnType: null,
      goldenSpawnAt: makeGoldenSpawnTimes(),
      goldenSpawnIndex: 0,
      width,
      height,
      keys: { left: false, right: false },
    }),
    [],
  )

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    const rect = stage.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = Math.max(280, Math.floor(rect.width))
    const cssH = Math.max(360, Math.floor(rect.height))
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const game = stateRef.current
    if (game) {
      const ratio = cssW / Math.max(1, game.width)
      game.farmerX *= ratio
      const yRatio = cssH / Math.max(1, game.height)
      game.items = game.items.map((item) => ({
        ...item,
        x: item.x * ratio,
        y: item.y * yRatio,
      }))
      game.fx = (game.fx ?? []).map((fx) => ({
        ...fx,
        x: fx.x * ratio,
        y: fx.y * yRatio,
      }))
      game.width = cssW
      game.height = cssH
      game.farmerX = Math.min(Math.max(game.farmerX, 40), cssW - 40)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadImage(farmerSrc),
      loadImage(riceSrc),
      loadImage(goldenRiceSrc),
      loadImage(weedSrc),
      loadImage(brokenHeartSrc),
    ])
      .then(([farmer, rice, goldenRice, weed, brokenHeart]) => {
        if (cancelled) return
        imagesRef.current = { farmer, rice, goldenRice, weed, brokenHeart }
        setAssetsReady(true)
      })
      .catch((error) => {
        console.error('[ThanksgivingGame] asset load failed', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas, assetsReady, phase])

  const drawFrame = useCallback((game) => {
    const canvas = canvasRef.current
    const imgs = imagesRef.current
    if (!canvas || !imgs.farmer) return
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = game

    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#8ec5e8')
    gradient.addColorStop(0.45, '#f3c57a')
    gradient.addColorStop(1, '#d4a14a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(120, 78, 28, 0.18)'
    ctx.fillRect(0, h * 0.78, w, h * 0.22)

    const bottomPad = Math.max(18, Math.round(h * 0.035))
    const farmerH = Math.min(h * 0.26, 140)
    const farmerW = farmerH * (imgs.farmer.width / imgs.farmer.height)
    const farmerX = game.farmerX - farmerW / 2
    const farmerY = h - farmerH - bottomPad
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(imgs.farmer, farmerX, farmerY, farmerW, farmerH)

    for (const item of game.items) {
      const sprite =
        item.type === 'golden'
          ? imgs.goldenRice
          : item.type === 'rice'
            ? imgs.rice
            : imgs.weed
      if (!sprite) continue
      ctx.drawImage(sprite, item.x, item.y, item.w, item.h)
    }

    for (const fx of game.fx ?? []) {
      const t = Math.min(1, fx.age / fx.life)
      const alpha = 1 - t
      const rise = fx.y - t * 42
      ctx.save()
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (fx.kind === 'plus') {
        const comboSize = Math.round(Math.min(22, w * 0.045))
        const scoreSize = Math.round(Math.min(36, w * 0.075))
        const comboLabel = `COMBO ${fx.combo}`
        const scoreLabel = `+${fx.points}`

        ctx.font = `900 ${comboSize}px system-ui, sans-serif`
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(80, 35, 8, 0.65)'
        const comboGrad = ctx.createLinearGradient(fx.x, rise - 28, fx.x, rise - 8)
        comboGrad.addColorStop(0, '#fff6c2')
        comboGrad.addColorStop(0.4, '#ffb347')
        comboGrad.addColorStop(0.75, '#e86a1a')
        comboGrad.addColorStop(1, '#a63b12')
        ctx.strokeText(comboLabel, fx.x, rise - 20)
        ctx.fillStyle = comboGrad
        ctx.fillText(comboLabel, fx.x, rise - 20)

        ctx.font = `800 ${scoreSize}px system-ui, sans-serif`
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(90, 40, 10, 0.55)'
        const scoreGrad = ctx.createLinearGradient(fx.x, rise - 4, fx.x, rise + 18)
        if (fx.golden) {
          scoreGrad.addColorStop(0, '#fffef0')
          scoreGrad.addColorStop(0.35, '#ffe566')
          scoreGrad.addColorStop(0.7, '#ffc107')
          scoreGrad.addColorStop(1, '#e69500')
        } else {
          scoreGrad.addColorStop(0, '#fff8a8')
          scoreGrad.addColorStop(0.5, '#ffd24a')
          scoreGrad.addColorStop(1, '#f0a020')
        }
        ctx.strokeText(scoreLabel, fx.x, rise + 8)
        ctx.fillStyle = scoreGrad
        ctx.fillText(scoreLabel, fx.x, rise + 8)
      } else if (fx.kind === 'brokenHeart' && imgs.brokenHeart) {
        const size = Math.min(42, w * 0.09)
        ctx.drawImage(imgs.brokenHeart, fx.x - size / 2, rise - size / 2, size, size)
      }
      ctx.restore()
    }
  }, [])

  const endGame = useCallback(
    async (game) => {
      game.phase = 'gameover'
      syncHud(game)
      setSubmitStatus('idle')
      setSubmitMessage('')
      setRankingStatus('loading')

      const rankingResult = await fetchThanksgivingGameRanking(15)
      if (rankingResult.success) {
        setRankingRows(rankingResult.rows)
        setRankingStatus(rankingResult.rows.length ? 'ready' : 'empty')
      } else {
        setRankingRows([])
        setRankingStatus('error')
      }

      const displayName = nicknameRef.current
      const guestKey = guestKeyRef.current
      setSubmitStatus('saving')
      const submitResult = await submitThanksgivingGameScore({
        score: game.score,
        displayName,
        guestKey,
        isLoggedIn,
      })

      if (submitResult.success) {
        setMyBest(submitResult.bestScore)
        setMyEntryId(submitResult.entryId)
        setSubmitStatus(submitResult.isNewBest ? 'new' : 'kept')
        setSubmitMessage(
          submitResult.isNewBest
            ? '최고 점수가 갱신되었습니다.'
            : '기존 최고 점수를 유지합니다.',
        )
      } else {
        setSubmitStatus('error')
        setSubmitMessage('점수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }

      const mine = await fetchMyThanksgivingGameScore({ isLoggedIn, guestKey })
      if (mine.success) {
        setMyBest(mine.bestScore)
        setMyRank(mine.rank)
        setMyEntryId(mine.entryId)
      }

      const refreshed = await fetchThanksgivingGameRanking(15)
      if (refreshed.success) {
        setRankingRows(refreshed.rows)
        setRankingStatus(refreshed.rows.length ? 'ready' : 'empty')
      }
    },
    [isLoggedIn, syncHud],
  )

  const tick = useCallback(
    (timestamp) => {
      const game = stateRef.current
      if (!game) return

      if (!game.lastTs) game.lastTs = timestamp
      const dt = Math.min(0.05, (timestamp - game.lastTs) / 1000)
      game.lastTs = timestamp

      if (game.phase === 'playing') {
        game.elapsedMs += dt * 1000
        if (game.elapsedMs >= GAME_DURATION_MS) {
          game.elapsedMs = GAME_DURATION_MS
          drawFrame(game)
          syncHud(game)
          void endGame(game)
          return
        }

        const mult = getSpeedMultiplier(game.elapsedMs / 1000)
        const { width: w, height: h } = game

        if (game.keys.left) game.farmerX -= FARMER_SPEED * dt
        if (game.keys.right) game.farmerX += FARMER_SPEED * dt
        game.farmerX = Math.min(Math.max(game.farmerX, 36), w - 36)

        if (game.elapsedMs >= game.nextSpawnAt) {
          const nextGoldenAt = game.goldenSpawnAt?.[game.goldenSpawnIndex]
          const canSpawnGolden =
            nextGoldenAt != null &&
            game.elapsedMs >= nextGoldenAt &&
            game.lastSpawnType !== 'golden'

          let type = 'weed'
          if (canSpawnGolden) {
            type = 'golden'
            game.goldenSpawnIndex += 1
          } else if (Math.random() < 0.62) {
            type = 'rice'
          }

          const size =
            type === 'golden'
              ? Math.min(72, w * 0.14)
              : type === 'rice'
                ? Math.min(64, w * 0.12)
                : Math.min(58, w * 0.11)
          const margin = size
          game.itemSeq += 1
          game.lastSpawnType = type
          game.items.push({
            id: game.itemSeq,
            type,
            x: margin + Math.random() * Math.max(1, w - margin * 2),
            y: -size,
            w: size,
            h: size,
            hit: false,
          })
          const gap = (900 + Math.random() * 700) / mult
          game.nextSpawnAt = game.elapsedMs + gap
        }

        const farmerImg = imagesRef.current.farmer
        const bottomPad = Math.max(18, Math.round(h * 0.035))
        const farmerH = Math.min(h * 0.26, 140)
        const farmerW = farmerImg
          ? farmerH * (farmerImg.width / farmerImg.height)
          : farmerH * 0.72
        const farmerX = game.farmerX - farmerW / 2
        const farmerY = h - farmerH - bottomPad
        const basket = {
          x: farmerX + farmerW * 0.18,
          y: farmerY + farmerH * 0.02,
          w: farmerW * 0.64,
          h: farmerH * 0.28,
        }

        const fallSpeed = BASE_FALL_SPEED * mult
        const nextItems = []
        for (const item of game.items) {
          if (item.hit) continue
          item.y += fallSpeed * dt
          const itemBox = {
            x: item.x + item.w * 0.2,
            y: item.y + item.h * 0.2,
            w: item.w * 0.6,
            h: item.h * 0.6,
          }
          if (rectsOverlap(basket, itemBox)) {
            item.hit = true
            fxSeqRef.current += 1
            const fxX = item.x + item.w / 2
            const fxY = item.y + item.h / 2
            if (item.type === 'rice' || item.type === 'golden') {
              game.combo = (game.combo ?? 0) + 1
              const points =
                item.type === 'golden'
                  ? getGoldenComboPoints(game.combo)
                  : getComboPoints(game.combo)
              game.score += points
              game.fx.push({
                id: fxSeqRef.current,
                kind: 'plus',
                combo: game.combo,
                points,
                golden: item.type === 'golden',
                x: fxX,
                y: fxY,
                age: 0,
                life: 0.85,
              })
            } else {
              game.combo = 0
              game.lives -= 1
              game.fx.push({
                id: fxSeqRef.current,
                kind: 'brokenHeart',
                x: fxX,
                y: fxY,
                age: 0,
                life: 0.85,
              })
              if (game.lives <= 0) {
                game.lives = 0
                game.items = nextItems
                drawFrame(game)
                syncHud(game)
                void endGame(game)
                return
              }
            }
            continue
          }
          if (item.y < h + item.h) {
            nextItems.push(item)
          }
        }
        game.items = nextItems
        game.fx = (game.fx ?? [])
          .map((fx) => ({ ...fx, age: fx.age + dt }))
          .filter((fx) => fx.age < fx.life)
        syncHud(game)
      } else if (game.phase === 'paused' || game.phase === 'gameover') {
        // keep drawing static frame; fx freeze while paused
      }

      drawFrame(game)
      rafRef.current = window.requestAnimationFrame(tick)
    },
    [drawFrame, endGame, syncHud],
  )

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const startLoop = useCallback(() => {
    stopLoop()
    const game = stateRef.current
    if (game) game.lastTs = 0
    rafRef.current = window.requestAnimationFrame(tick)
  }, [stopLoop, tick])

  const startGame = useCallback(() => {
    const check = validateGameNickname(nicknameRef.current)
    if (!check.ok) {
      setNicknameError(check.message)
      setPhase('nickname')
      return
    }
    storeNickname(check.nickname)
    setNickname(check.nickname)
    setNicknameError('')
    resizeCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    stateRef.current = createFreshState(w, h)
    syncHud(stateRef.current)
    startLoop()
  }, [createFreshState, resizeCanvas, startLoop, syncHud])

  const togglePause = useCallback(() => {
    const game = stateRef.current
    if (!game) return
    if (rankingOpen) return
    if (game.phase === 'playing') {
      game.phase = 'paused'
      syncHud(game)
    } else if (game.phase === 'paused') {
      game.phase = 'playing'
      game.lastTs = 0
      syncHud(game)
    }
  }, [rankingOpen, syncHud])

  const loadRankingBoard = useCallback(async () => {
    setRankingStatus('loading')
    const rankingResult = await fetchThanksgivingGameRanking(15)
    if (rankingResult.success) {
      setRankingRows(rankingResult.rows)
      setRankingStatus(rankingResult.rows.length ? 'ready' : 'empty')
    } else {
      setRankingRows([])
      setRankingStatus('error')
    }

    const mine = await fetchMyThanksgivingGameScore({
      isLoggedIn,
      guestKey: guestKeyRef.current,
    })
    if (mine.success) {
      setMyBest(mine.bestScore)
      setMyRank(mine.rank)
      setMyEntryId(mine.entryId)
    }
  }, [isLoggedIn])

  const openRanking = useCallback(() => {
    const game = stateRef.current
    if (game?.phase === 'playing') {
      game.phase = 'paused'
      rankingResumeRef.current = true
      syncHud(game)
    } else {
      rankingResumeRef.current = false
    }
    setRankingOpen(true)
    void loadRankingBoard()
  }, [loadRankingBoard, syncHud])

  const closeRanking = useCallback(() => {
    setRankingOpen(false)
    if (!rankingResumeRef.current) return
    rankingResumeRef.current = false
    const game = stateRef.current
    if (game?.phase === 'paused') {
      game.phase = 'playing'
      game.lastTs = 0
      syncHud(game)
    }
  }, [syncHud])

  const resetToIntro = useCallback(() => {
    stopLoop()
    stateRef.current = null
    touchRef.current = { active: false, offsetX: 0 }
    rankingResumeRef.current = false
    setRankingOpen(false)
    setScore(0)
    setCombo(0)
    setLives(INITIAL_LIVES)
    setElapsedMs(0)
    setPhase('intro')
    setRankingRows([])
    setRankingStatus('idle')
    setMyBest(null)
    setMyRank(null)
    setMyEntryId(null)
    setSubmitStatus('idle')
    setSubmitMessage('')
    setNicknameError('')
  }, [stopLoop])

  useEffect(() => () => stopLoop(), [stopLoop])

  useEffect(() => {
    const onKeyDown = (event) => {
      const game = stateRef.current
      if (!game || (game.phase !== 'playing' && game.phase !== 'paused')) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
      }
      if (game.phase !== 'playing') return
      if (event.key === 'ArrowLeft') game.keys.left = true
      if (event.key === 'ArrowRight') game.keys.right = true
    }
    const onKeyUp = (event) => {
      const game = stateRef.current
      if (!game) return
      if (event.key === 'ArrowLeft') game.keys.left = false
      if (event.key === 'ArrowRight') game.keys.right = false
    }
    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const onTouchStart = (event) => {
    const game = stateRef.current
    const stage = stageRef.current
    if (!game || game.phase !== 'playing' || !stage) return
    const touch = event.touches[0]
    if (!touch) return
    const rect = stage.getBoundingClientRect()
    const x = touch.clientX - rect.left
    touchRef.current = { active: true, offsetX: x - game.farmerX }
    event.preventDefault()
  }

  const onTouchMove = (event) => {
    const game = stateRef.current
    const stage = stageRef.current
    if (!game || game.phase !== 'playing' || !stage || !touchRef.current.active) return
    const touch = event.touches[0]
    if (!touch) return
    const rect = stage.getBoundingClientRect()
    const x = touch.clientX - rect.left - touchRef.current.offsetX
    game.farmerX = Math.min(Math.max(x, 36), game.width - 36)
    event.preventDefault()
  }

  const onTouchEnd = () => {
    touchRef.current.active = false
  }

  const handleNicknameStart = () => {
    const check = validateGameNickname(nickname)
    if (!check.ok) {
      setNicknameError(check.message)
      return
    }
    setNickname(check.nickname)
    nicknameRef.current = check.nickname
    startGame()
  }

  const isPreGame = phase === 'intro' || phase === 'tutorial' || phase === 'nickname'
  const highlightMe = useMemo(
    () => (row) =>
      (myEntryId && row.entryId === myEntryId) ||
      (isLoggedIn && row.userId && row.userId === effectiveUserId) ||
      (!isLoggedIn && guestKeyRef.current && row.guestKey === guestKeyRef.current),
    [effectiveUserId, isLoggedIn, myEntryId],
  )

  return (
    <div className="tg-page">
      <div className="tg-page__inner">
        <header className="tg-hud" aria-label="게임 상태">
          <div className="tg-hud__left">
            <p className="tg-hud__score">점수: {score}</p>
            <p className="tg-hud__combo" aria-label={`콤보 ${combo}`}>
              COMBO {combo}
            </p>
            <p className="tg-hud__lives" aria-label={`생명 ${lives}개`}>
              생명:{' '}
              {Array.from({ length: INITIAL_LIVES }, (_, index) => (
                <img
                  key={index}
                  src={heartSrc}
                  alt=""
                  aria-hidden="true"
                  className={`tg-hud__heart${index < lives ? '' : ' tg-hud__heart--empty'}`}
                />
              ))}
            </p>
          </div>
          <p className="tg-hud__time" aria-live="polite">
            {formatTime(Math.max(0, GAME_DURATION_MS - elapsedMs))}
          </p>
          <div className="tg-hud__right">
            <button
              type="button"
              className="tg-btn tg-btn--ghost"
              onClick={openRanking}
              aria-label="랭킹 보기"
            >
              랭킹
            </button>
            <button
              type="button"
              className="tg-btn tg-btn--ghost"
              onClick={togglePause}
              disabled={(phase !== 'playing' && phase !== 'paused') || rankingOpen}
              aria-label={phase === 'paused' ? '게임 계속하기' : '일시정지'}
            >
              {phase === 'paused' ? '계속' : '일시정지'}
            </button>
            <button
              type="button"
              className="tg-btn tg-btn--ghost"
              onClick={resetToIntro}
              aria-label="처음부터 다시 시작"
            >
              처음부터
            </button>
          </div>
        </header>

        <div
          className={`tg-stage${isPreGame ? ' tg-stage--pregame' : ''}`}
          ref={stageRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <canvas ref={canvasRef} className="tg-canvas" aria-label="추수하기 게임 영역" />

          {phase === 'intro' ? (
            <div className="tg-overlay tg-overlay--title">
              <div className="tg-title-screen">
                <img
                  src={farmerSrc}
                  alt=""
                  aria-hidden="true"
                  className="tg-title-screen__farmer"
                />
                <h1 className="tg-title-screen__title">추수하기 게임</h1>
                <button
                  type="button"
                  className="tg-btn tg-btn--primary tg-title-screen__cta"
                  onClick={() => setPhase('tutorial')}
                  disabled={!assetsReady}
                >
                  {assetsReady ? '다음' : '이미지 불러오는 중…'}
                </button>
              </div>
            </div>
          ) : null}

          {phase === 'tutorial' ? (
            <div className="tg-overlay tg-overlay--tutorial">
              <div className="tg-card tg-card--tutorial">
                <h2 className="tg-card__title">게임 방법을 알아봐요!</h2>
                <div className="tg-tutorial-grid">
                  <article className="tg-tutorial-item">
                    <div className="tg-tutorial-item__visual">
                      <span className="tg-ring">
                        <img src={riceSrc} alt="" className="tg-tutorial-sprite" />
                      </span>
                      <strong className="tg-tutorial-badge">+1점</strong>
                    </div>
                    <p className="tg-tutorial-item__text">벼를 담으면 1점을 획득해요!</p>
                  </article>

                  <article className="tg-tutorial-item">
                    <div className="tg-tutorial-item__visual">
                      <span className="tg-ring">
                        <img src={goldenRiceSrc} alt="" className="tg-tutorial-sprite" />
                      </span>
                      <strong className="tg-tutorial-badge tg-tutorial-badge--gold">+5점</strong>
                    </div>
                    <p className="tg-tutorial-item__text">
                      황금 벼이삭은 드물게 나와요. 5점~콤보 최대 25점!
                    </p>
                  </article>

                  <article className="tg-tutorial-item">
                    <div className="tg-tutorial-item__visual">
                      <span className="tg-ring">
                        <img src={weedSrc} alt="" className="tg-tutorial-sprite" />
                      </span>
                      <img
                        src={brokenHeartSrc}
                        alt=""
                        className="tg-tutorial-sprite tg-tutorial-sprite--heart"
                      />
                    </div>
                    <p className="tg-tutorial-item__text">가라지를 담으면 생명이 1개 줄어요!</p>
                  </article>

                  <article className="tg-tutorial-item">
                    <div className="tg-tutorial-item__visual tg-tutorial-item__visual--hud">
                      <div className="tg-mini-hud">
                        <span>점수: 0</span>
                        <span className="tg-mini-hud__lives">
                          생명:{' '}
                          <span className="tg-ring tg-ring--lives">
                            <img src={heartSrc} alt="" />
                            <img src={heartSrc} alt="" />
                            <img src={heartSrc} alt="" />
                          </span>
                        </span>
                      </div>
                      <strong className="tg-tutorial-badge tg-tutorial-badge--warn">
                        0개면 게임 오버!
                      </strong>
                    </div>
                    <p className="tg-tutorial-item__text">생명 0 또는 1분 후 종료돼요.</p>
                  </article>

                  <article className="tg-tutorial-item tg-tutorial-item--wide">
                    <div className="tg-tutorial-item__row">
                      <div className="tg-tutorial-item__visual tg-tutorial-item__visual--move">
                        <span className="tg-arrow" aria-hidden="true">
                          ←
                        </span>
                        <img
                          src={farmerSrc}
                          alt=""
                          className="tg-tutorial-sprite tg-tutorial-sprite--farmer"
                        />
                        <span className="tg-arrow" aria-hidden="true">
                          →
                        </span>
                      </div>
                      <div className="tg-tutorial-item__copy">
                        <p className="tg-tutorial-item__text">좌우로 이동하여 벼를 수확하세요!</p>
                        <p className="tg-tutorial-item__hint">키보드 ← → 방향키로 이동</p>
                        <p className="tg-tutorial-item__hint">또는 화면을 좌우로 드래그하여 이동</p>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="tg-card__actions tg-card__actions--tutorial">
                  <button type="button" className="tg-btn tg-btn--ghost" onClick={() => setPhase('intro')}>
                    이전
                  </button>
                  <button
                    type="button"
                    className="tg-btn tg-btn--primary"
                    onClick={() => setPhase('nickname')}
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {phase === 'nickname' ? (
            <div className="tg-overlay">
              <div className="tg-card">
                <h2 className="tg-card__title">게임에서 사용할 닉네임을 설정해 주세요!</h2>
                <p className="tg-card__text">랭킹 보드에 표시될 이름이에요.</p>
                <label className="tg-nickname">
                  <span className="tg-nickname__label">닉네임</span>
                  <input
                    className="tg-nickname__input"
                    type="text"
                    value={nickname}
                    maxLength={12}
                    autoComplete="nickname"
                    placeholder="2~12자로 입력"
                    onChange={(event) => {
                      setNickname(event.target.value)
                      if (nicknameError) setNicknameError('')
                    }}
                  />
                </label>
                {nicknameError ? <p className="tg-nickname__error">{nicknameError}</p> : null}
                {!isLoggedIn ? (
                  <p className="tg-card__note">비회원도 닉네임만 있으면 바로 플레이할 수 있어요.</p>
                ) : (
                  <p className="tg-card__note">
                    계정 이름은 바뀌지 않아요. 이번 게임 랭킹 표시 이름만 사용됩니다.
                  </p>
                )}
                <div className="tg-card__actions">
                  <button
                    type="button"
                    className="tg-btn tg-btn--ghost"
                    onClick={() => setPhase('tutorial')}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="tg-btn tg-btn--primary"
                    onClick={handleNicknameStart}
                    disabled={!assetsReady}
                  >
                    게임 시작
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {phase === 'paused' && !rankingOpen ? (
            <div className="tg-overlay" role="status">
              <div className="tg-card">
                <h2 className="tg-card__title">일시정지</h2>
                <p className="tg-card__text">게임이 잠시 멈춰 있습니다.</p>
                <button type="button" className="tg-btn tg-btn--primary" onClick={togglePause}>
                  계속하기
                </button>
              </div>
            </div>
          ) : null}

          {rankingOpen ? (
            <div className="tg-overlay">
              <div className="tg-card tg-card--wide">
                <h2 className="tg-card__title">랭킹</h2>
                <p className="tg-card__text">
                  개인 최고 점수: {myBest == null ? '-' : `${myBest}점`}
                  {myRank != null ? ` · 내 순위 ${myRank}위` : ''}
                </p>
                <div className="tg-rank">
                  <h3 className="tg-rank__title">전체 랭킹</h3>
                  {rankingStatus === 'loading' ? (
                    <p className="tg-card__text">랭킹을 불러오는 중…</p>
                  ) : null}
                  {rankingStatus === 'error' ? (
                    <p className="tg-card__text">랭킹을 불러오지 못했습니다.</p>
                  ) : null}
                  {rankingStatus === 'empty' ? (
                    <p className="tg-card__text">아직 등록된 기록이 없습니다.</p>
                  ) : null}
                  {rankingStatus === 'ready' ? (
                    <ol className="tg-rank__list">
                      {rankingRows.map((row) => (
                        <li
                          key={row.entryId ?? `${row.rank}-${row.displayName}`}
                          className={
                            highlightMe(row)
                              ? 'tg-rank__item tg-rank__item--me'
                              : 'tg-rank__item'
                          }
                        >
                          <RankPlace rank={row.rank} />
                          <span>{row.displayName}</span>
                          <span>{row.bestScore}점</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
                <div className="tg-card__actions">
                  <button type="button" className="tg-btn tg-btn--primary" onClick={closeRanking}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {phase === 'gameover' && !rankingOpen ? (
            <div className="tg-overlay">
              <div className="tg-card tg-card--wide">
                <h2 className="tg-card__title">게임 오버</h2>
                <p className="tg-card__score">최종 점수: {score}점</p>
                <p className="tg-card__text">
                  닉네임: <strong>{nickname}</strong>
                </p>
                <p className="tg-card__text">
                  개인 최고 점수: {myBest == null ? '-' : `${myBest}점`}
                  {myRank != null ? ` · 내 순위 ${myRank}위` : ''}
                </p>
                {submitMessage ? (
                  <p className="tg-card__note" data-status={submitStatus}>
                    {submitMessage}
                  </p>
                ) : null}

                <div className="tg-rank">
                  <h3 className="tg-rank__title">전체 랭킹</h3>
                  {rankingStatus === 'loading' ? (
                    <p className="tg-card__text">랭킹을 불러오는 중…</p>
                  ) : null}
                  {rankingStatus === 'error' ? (
                    <p className="tg-card__text">
                      랭킹을 불러오지 못했습니다. 게임은 계속 이용할 수 있습니다.
                    </p>
                  ) : null}
                  {rankingStatus === 'empty' ? (
                    <p className="tg-card__text">아직 등록된 기록이 없습니다.</p>
                  ) : null}
                  {rankingStatus === 'ready' ? (
                    <ol className="tg-rank__list">
                      {rankingRows.map((row) => (
                        <li
                          key={row.entryId ?? `${row.rank}-${row.displayName}`}
                          className={
                            highlightMe(row)
                              ? 'tg-rank__item tg-rank__item--me'
                              : 'tg-rank__item'
                          }
                        >
                          <RankPlace rank={row.rank} />
                          <span>{row.displayName}</span>
                          <span>{row.bestScore}점</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>

                <div className="tg-card__actions">
                  <button type="button" className="tg-btn tg-btn--primary" onClick={startGame}>
                    다시하기
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
