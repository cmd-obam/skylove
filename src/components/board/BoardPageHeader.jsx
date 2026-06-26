import Breadcrumb from '@/components/Breadcrumb'

function BoardPageHeader({ title, description }) {
  return (
    <header className="church-news-page__header">
      <div className="church-news-page__heading">
        <h1 className="church-news-page__title">{title}</h1>
        {description && <p className="church-news-page__description">{description}</p>}
      </div>
      <Breadcrumb />
    </header>
  )
}

export default BoardPageHeader
