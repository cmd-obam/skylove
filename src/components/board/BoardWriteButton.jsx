import { Link } from 'react-router-dom'
import { useBoardAdmin } from '@/hooks/useBoardAdmin'

function BoardWriteButton({ to, buttonClassName = 'church-news-board__search-button' }) {
  const { canManageBoard, loading } = useBoardAdmin()

  if (loading || !canManageBoard) {
    return null
  }

  return (
    <Link to={to} className={`${buttonClassName} board-write-button`}>
      글쓰기
    </Link>
  )
}

export default BoardWriteButton
