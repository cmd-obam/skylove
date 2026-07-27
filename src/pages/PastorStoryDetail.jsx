import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import { fetchRelatedBoardPosts } from '@/services/board/posts'
import { useBoardPost } from '@/hooks/useBoardPost'
import { PASTOR_STORY_POST_TYPE } from '@/services/auth/roles'

const LIST_PATH = '/church-news/pastor-story'
const POST_TYPE = PASTOR_STORY_POST_TYPE

function PastorStoryDetail() {
  const { postId } = useParams()
  const { post, loading } = useBoardPost(POST_TYPE, postId)
  const [relatedPosts, setRelatedPosts] = useState([])

  useEffect(() => {
    if (!postId) {
      return
    }

    let isMounted = true

    async function loadRelated() {
      const related = await fetchRelatedBoardPosts(POST_TYPE, postId)
      if (isMounted) {
        setRelatedPosts(related)
      }
    }

    loadRelated()

    return () => {
      isMounted = false
    }
  }, [postId])

  if (loading) {
    return null
  }

  return (
    <BoardPostDetail
      pageTitle="담임목사 이야기"
      pageDescription="담임목사의 이야기를 전합니다."
      listPath={LIST_PATH}
      detailPathPrefix={LIST_PATH}
      postType={POST_TYPE}
      post={post}
      relatedPosts={relatedPosts}
      ariaLabel="담임목사 이야기 상세"
      listButtonLabel="목록"
    />
  )
}

export default PastorStoryDetail
