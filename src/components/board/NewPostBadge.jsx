import { isNewPost } from '@/utils/isNewPost'
import './NewPostBadge.css'

function NewPostBadge({ createdAt }) {
  if (!isNewPost(createdAt)) {
    return null
  }

  return (
    <span className="new-post-badge" aria-label="새 글">
      NEW
    </span>
  )
}

export default NewPostBadge
