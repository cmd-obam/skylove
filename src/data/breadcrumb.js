import { findMenuSection } from '@/data/menu'

export function getBreadcrumbItems(pathname) {
  const items = [{ label: '홈', path: '/', isHome: true, isCurrent: false }]

  const section = findMenuSection(pathname)
  if (!section) {
    return items
  }

  const currentChild = section.children?.find((child) => child.path === pathname)

  items.push({
    label: section.title,
    path: section.path,
    isCurrent: false,
  })

  if (currentChild && currentChild.path !== section.path) {
    items.push({
      label: currentChild.title,
      path: currentChild.path,
      isCurrent: true,
    })
  } else {
    items[items.length - 1].isCurrent = true
  }

  return items
}
