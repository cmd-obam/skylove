import { Link } from 'react-router-dom'
import './DropdownMenu.css'

function DropdownMenuItem({ item, onLinkClick }) {
  if (item.children?.length) {
    return (
      <li className="dropdown-menu__item dropdown-menu__item--has-flyout" role="none">
        <span className="dropdown-menu__link dropdown-menu__link--parent" role="menuitem" tabIndex={0}>
          {item.title}
        </span>
        <ul className="dropdown-menu__flyout" role="menu">
          {item.children.map((child) => (
            <li key={child.path} className="dropdown-menu__flyout-item" role="none">
              <Link
                to={child.path}
                className="dropdown-menu__link dropdown-menu__link--flyout"
                role="menuitem"
                onClick={onLinkClick}
              >
                {child.title}
              </Link>
            </li>
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li className="dropdown-menu__item" role="none">
      <Link
        to={item.path}
        className="dropdown-menu__link"
        role="menuitem"
        onClick={onLinkClick}
      >
        {item.title}
      </Link>
    </li>
  )
}

function DropdownMenu({ items, isOpen, onLinkClick }) {
  return (
    <ul
      className={`dropdown-menu${isOpen ? ' dropdown-menu--visible' : ''}`}
      role="menu"
    >
      {items.map((item) => (
        <DropdownMenuItem key={item.path} item={item} onLinkClick={onLinkClick} />
      ))}
    </ul>
  )
}

export default DropdownMenu
