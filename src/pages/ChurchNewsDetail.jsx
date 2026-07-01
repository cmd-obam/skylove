import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import { fetchRelatedBoardPosts } from '@/services/board/posts'
import { useBoardPost } from '@/hooks/useBoardPost'

const LIST_PATH = '/church-news'

function ChurchNewsDetail() {
  const { postId } = useParams()
  const { post, loading } = useBoardPost('church_news', postId)
  const [relatedPosts, setRelatedPosts] = useState([])

  useEffect(() => {
    if (!postId) {
      return
    }

    let isMounted = true

    async function loadRelated() {
      const related = await fetchRelatedBoardPosts('church_news', postId)
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
      pageTitle="교회소식"
      pageDescription="하늘사랑교회의 새로운 소식을 전합니다."
      listPath={LIST_PATH}
      detailPathPrefix={LIST_PATH}
      postType="church_news"
      post={post}
      relatedPosts={relatedPosts}
      ariaLabel="교회소식 상세"
      listButtonLabel="목록"
    />
  )
}

export default ChurchNewsDetail
