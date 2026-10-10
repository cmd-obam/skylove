/**
 * Temporary event menu (Thanksgiving mini-game).
 * Set EVENT_MENU_ENABLED to false to hide the Event nav item after the event.
 */
export const EVENT_MENU_ENABLED = true

export const THANKSGIVING_GAME_PATH = '/thanksgiving-game'

export const EVENT_MENU_ITEM = {
  title: '이벤트',
  path: THANKSGIVING_GAME_PATH,
  children: [{ title: '미니게임', path: THANKSGIVING_GAME_PATH }],
}
