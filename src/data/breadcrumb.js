import { findMenuSection, findMenuItemInSection } from '@/data/menu'
import { getMenuItemLabel } from '@/components/layout/MenuItemLabel'

export function getBreadcrumbItems(pathname) {
  const items = [{ label: '홈', path: '/', isHome: true, isCurrent: false }]

  if (pathname === '/about/facilities') {
    items.push({
      label: '교회시설 안내',
      path: '/about/facilities',
      isCurrent: true,
    })
    return items
  }

  const section = findMenuSection(pathname)
  if (!section) {
    return items
  }

  const match = findMenuItemInSection(section, pathname)

  items.push({
    label: section.title,
    path: section.path,
    isCurrent: false,
  })

  if (match?.parent) {
    items.push({
      label: match.parent.title,
      path: match.parent.path,
      isCurrent: false,
    })
    items.push({
      label: getMenuItemLabel(match.item),
      path: match.item.path,
      isCurrent: true,
    })
    return items
  }

  // Include the child label even when it shares the section path
  // (e.g. 홈 > 교회소개 > 담임목사 인사 for `/about`).
  if (match?.item) {
    items.push({
      label: getMenuItemLabel(match.item),
      path: match.item.path,
      isCurrent: true,
    })
    return items
  }

  items[items.length - 1].isCurrent = true
  return items
}
