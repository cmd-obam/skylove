import { FiImage } from 'react-icons/fi'
import NewPostBadge from '@/components/board/NewPostBadge'

function BoardPostTitle({ title, commentsCount, hasImage = false, createdAt }) {
  const count = Number.isFinite(Number(commentsCount)) ? Number(commentsCount) : 0

  return (
    <>
      <NewPostBadge createdAt={createdAt} />
      {title}
      {hasImage ? (
        <FiImage className="board-post-title__image-icon" aria-label="이미지 있음" />
      ) : null}
      <span className="board-post-title__comment-count">{` (${count})`}</span>
    </>
  )
}

export default BoardPostTitle
