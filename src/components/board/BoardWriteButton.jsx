import { Link } from 'react-router-dom'
import { useIsAdmin } from '@/hooks/useIsAdmin'

function BoardWriteButton({ to, buttonClassName = 'church-news-board__search-button' }) {
  const { isAdmin, loading } = useIsAdmin()

  if (loading || !isAdmin) {
    return null
  }

  return (
    <Link to={to} className={`${buttonClassName} board-write-button`}>
      글쓰기
    </Link>
  )
}

export default BoardWriteButton
