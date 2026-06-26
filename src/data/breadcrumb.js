import { findMenuSection, findMenuItemInSection } from '@/data/menu'

export function getBreadcrumbItems(pathname) {
  const items = [{ label: '홈', path: '/', isHome: true, isCurrent: false }]

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
      label: match.item.title,
      path: match.item.path,
      isCurrent: true,
    })
    return items
  }

  if (match?.item && match.item.path !== section.path) {
    items.push({
      label: match.item.title,
      path: match.item.path,
      isCurrent: true,
    })
    return items
  }

  items[items.length - 1].isCurrent = true
  return items
}
