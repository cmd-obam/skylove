/**
 * Temporary event menu (Thanksgiving mini-game).
 * Set EVENT_MENU_ENABLED to false to hide the Event nav item after the event.
 * The event pages and data stay in place. While SUPER_ADMIN_ONLY is true,
 * only super_admin users see the menu or open the page.
 */
export const EVENT_MENU_ENABLED = true

/** Restrict the event menu and /thanksgiving-game to super_admin. */
export const THANKSGIVING_GAME_SUPER_ADMIN_ONLY = true

export const THANKSGIVING_GAME_PATH = '/thanksgiving-game'

export const EVENT_MENU_ITEM = {
  title: '이벤트',
  path: THANKSGIVING_GAME_PATH,
  requiresSuperAdmin: true,
  children: [{ title: '미니게임', path: THANKSGIVING_GAME_PATH }],
}
