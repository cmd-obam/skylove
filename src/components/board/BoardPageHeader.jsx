import Breadcrumb from '@/components/Breadcrumb'
import '@/components/layout/SubLayout.css'

function BoardPageHeader({ title, description, showDivider = false }) {
  return (
    <>
      <header className="sub-layout__header">
        <div className="sub-layout__heading">
          <h1 className="sub-layout__title">{title}</h1>
          {description && <p className="sub-layout__subtitle">{description}</p>}
        </div>
        <Breadcrumb />
      </header>
      {showDivider && <hr className="church-news-page__divider" aria-hidden="true" />}
    </>
  )
}

export default BoardPageHeader
