import BoardPageHeader from '@/components/board/BoardPageHeader'
import './ChurchNews.css'
import './NewFamilyGuide.css'

function NewFamilyGuide() {
  return (
    <div className="new-family-page">
      <BoardPageHeader
        title="새가족 안내"
        description="새가족을 위한 안내를 제공합니다."
      />

      <div className="new-family-page__content">
        <p className="new-family-page__placeholder">콘텐츠 준비 중입니다.</p>
      </div>
    </div>
  )
}

export default NewFamilyGuide
