import { useNavigate } from 'react-router-dom'
import BoardPageHeader from '@/components/board/BoardPageHeader'
import '@/pages/ChurchNews.css'

function AccessDenied() {
  const navigate = useNavigate()

  return (
    <div className="church-news-page">
      <BoardPageHeader title="접근 제한" showDivider />
      <div className="board-access-denied">
        <p className="board-access-denied__message">접근 권한이 없습니다.</p>
        <button
          type="button"
          className="church-news-detail__list-button"
          onClick={() => navigate(-1)}
        >
          이전 페이지
        </button>
      </div>
    </div>
  )
}

export default AccessDenied
