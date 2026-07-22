import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useBoardAdmin } from '@/hooks/useBoardAdmin'
import { logBoardWriteButtonDebug } from '@/utils/authRoleDebug'

function BoardWriteButton({ to, buttonClassName = 'church-news-board__search-button' }) {
  const { canWriteBoard, loading } = useBoardAdmin()
  const visible = !loading && canWriteBoard

  useEffect(() => {
    logBoardWriteButtonDebug({ loading, canWriteBoard, visible })
  }, [loading, canWriteBoard, visible])

  if (!visible) {
    return null
  }

  return (
    <Link to={to} className={`${buttonClassName} board-write-button`}>
      글쓰기
    </Link>
  )
}

export default BoardWriteButton
