import { MENU_ITEMS, findMenuSection } from '@/data/menu'
import { getMenuItemLabel } from '@/components/layout/MenuItemLabel'

/** Map write/edit routes that live outside their list path back onto the menu tree. */
const PATH_ALIASES = [
  { pattern: /^\/news(\/|$)/, resolveTo: '/church-news' },
  { pattern: /^\/album(\/|$)/, resolveTo: '/church-news/album' },
]

function resolveMenuPathname(pathname) {
  for (const alias of PATH_ALIASES) {
    if (alias.pattern.test(pathname)) {
      return alias.resolveTo
    }
  }

  return pathname
}

function pathMatches(menuPath, pathname) {
  return pathname === menuPath || pathname.startsWith(`${menuPath}/`)
}

function scoreTrail(trail, pathname) {
  const leaf = trail[trail.length - 1]
  const exactBonus = pathname === leaf.path ? 1000 : 0
  return exactBonus + trail.length * 100 + leaf.path.length
}

/**
 * Deepest matching trail under a list of menu items.
 * Prefers nested leaves over parent groups that share the same path.
 */
function findDeepestTrail(items, pathname) {
  let best = null

  for (const item of items ?? []) {
    let candidate = null

    if (item.children?.length) {
      const childTrail = findDeepestTrail(item.children, pathname)
      if (childTrail) {
        candidate = [item, ...childTrail]
      }
    }

    if (!candidate && pathMatches(item.path, pathname)) {
      candidate = [item]
    }

    if (
      candidate &&
      (!best || scoreTrail(candidate, pathname) > scoreTrail(best, pathname))
    ) {
      best = candidate
    }
  }

  return best
}

/** Collapse nested parent/leaf pairs that share the same path and label. */
function dedupeTrail(trail) {
  const result = []

  for (const item of trail ?? []) {
    const previous = result[result.length - 1]
    if (
      previous &&
      previous.path === item.path &&
      getMenuItemLabel(previous) === getMenuItemLabel(item)
    ) {
      continue
    }
    result.push(item)
  }

  return result
}

export function getBreadcrumbItems(pathname) {
  const items = [{ label: '홈', path: '/', isHome: true, isCurrent: false }]
  const menuPathname = resolveMenuPathname(pathname)

  const section =
    findMenuSection(menuPathname) ??
    MENU_ITEMS.find(
      (item) =>
        menuPathname === item.path || menuPathname.startsWith(`${item.path}/`),
    )

  if (!section) {
    items[0].isCurrent = true
    return items
  }

  // Always keep section as its own crumb so names like
  // 홈 > 교회소식 > 교회소식 still show category + subcategory.
  items.push({
    label: section.title,
    path: section.path,
    isCurrent: false,
  })

  const trail = dedupeTrail(findDeepestTrail(section.children, menuPathname))

  if (!trail.length) {
    items[items.length - 1].isCurrent = true
    return items
  }

  trail.forEach((menuItem, index) => {
    items.push({
      label: getMenuItemLabel(menuItem),
      path: menuItem.path,
      isCurrent: index === trail.length - 1,
    })
  })

  return items
}
