function HomeSectionHeader({ eyebrow, title, titleLines, action }) {
  const lines = titleLines ?? (title ? [title] : [])

  return (
    <div className={`home-section__header${action ? ' home-section__header--with-action' : ''}`}>
      <div className="home-section__heading">
        {eyebrow && <p className="home-section__eyebrow">{eyebrow}</p>}
        <h2 className="home-section__title">
          {lines.map((line) => (
            <span key={line} className="home-section__title-line">
              {line}
            </span>
          ))}
        </h2>
      </div>
      {action}
    </div>
  )
}

export default HomeSectionHeader
