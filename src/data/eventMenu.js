/**
 * Temporary event menu (Thanksgiving mini-game).
 * Set EVENT_MENU_ENABLED to false to hide the Event nav item after the event.
 * While SUPER_ADMIN_ONLY is true, only super_admin users see/use the mini-game.
 */
export const EVENT_MENU_ENABLED = true

/** Restrict mini-game access to super_admin until public launch. */
export const THANKSGIVING_GAME_SUPER_ADMIN_ONLY = false

export const THANKSGIVING_GAME_PATH = '/thanksgiving-game'

export const EVENT_MENU_ITEM = {
  title: '이벤트',
  path: THANKSGIVING_GAME_PATH,
  requiresSuperAdmin: false,
  children: [{ title: '미니게임', path: THANKSGIVING_GAME_PATH }],
}
