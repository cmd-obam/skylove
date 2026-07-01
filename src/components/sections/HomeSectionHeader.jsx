function HomeSectionHeader({ eyebrow, title, action }) {
  return (
    <div className={`home-section__header${action ? ' home-section__header--with-action' : ''}`}>
      <div className="home-section__heading">
        {eyebrow && <p className="home-section__eyebrow">{eyebrow}</p>}
        <h2 className="home-section__title">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export default HomeSectionHeader
