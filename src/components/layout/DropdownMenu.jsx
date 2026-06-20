import { Link } from 'react-router-dom'
import './DropdownMenu.css'

function DropdownMenu({ items, onLinkClick }) {
  return (
    <ul className="dropdown-menu" role="menu">
      {items.map((item) => (
        <li key={item.path} className="dropdown-menu__item" role="none">
          <Link
            to={item.path}
            className="dropdown-menu__link"
            role="menuitem"
            onClick={onLinkClick}
          >
            {item.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default DropdownMenu
