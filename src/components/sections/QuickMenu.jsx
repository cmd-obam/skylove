import { Link } from 'react-router-dom'
import { QUICK_MENUS } from '@/data/menu'
import Card from '@/components/common/Card'
import './QuickMenu.css'

function QuickMenuCard({ item }) {
  const content = (
    <>
      <div className="icon-box">
        <img src={item.icon} alt="" className="icon-box__img" />
      </div>
      <span className="quick-menu__label">{item.title}</span>
      <span className="quick-menu__desc">{item.desc}</span>
    </>
  )

  if (item.href.startsWith('/')) {
    return (
      <Card as={Link} to={item.href} className="quick-menu__card">
        {content}
      </Card>
    )
  }

  return (
    <Card as="a" href={item.href} className="quick-menu__card">
      {content}
    </Card>
  )
}

function QuickMenu() {
  return (
    <section className="quick-menu" aria-label="빠른 메뉴">
      <div className="quick-menu__inner">
        <ul className="quick-menu__grid">
          {QUICK_MENUS.map((item) => (
            <li key={item.title} className="quick-menu__item">
              <QuickMenuCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default QuickMenu
