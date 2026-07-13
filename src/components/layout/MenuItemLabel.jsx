import './MenuItemLabel.css'

export function getMenuItemLabel(item) {
  if (!item?.title) {
    return ''
  }

  if (!item.subtitle) {
    return item.title
  }

  return `${item.title} ${item.subtitle}`
}

function MenuItemLabel({ item }) {
  if (!item.subtitle) {
    return item.title
  }

  return (
    <>
      {item.title}
      <br />
      <span className="menu-item-label__subtitle">{item.subtitle}</span>
    </>
  )
}

export default MenuItemLabel
