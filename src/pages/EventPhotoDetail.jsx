import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import PostUtilityBar from '@/components/board/PostUtilityBar'
import { fetchRelatedBoardPosts } from '@/services/board/posts'
import { useBoardPost } from '@/hooks/useBoardPost'

const LIST_PATH = '/church-news/album'

function EventPhotoDetail() {
  const { postId } = useParams()
  const { post, loading } = useBoardPost('album', postId)
  const [relatedPosts, setRelatedPosts] = useState([])

  useEffect(() => {
    if (!postId) {
      return
    }

    let isMounted = true

    async function loadRelated() {
      const related = await fetchRelatedBoardPosts('album', postId)
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
    <>
      <BoardPostDetail
        pageTitle="교회앨범"
        pageDescription="교회 행사와 다양한 활동 사진을 소개합니다."
        listPath={LIST_PATH}
        detailPathPrefix={LIST_PATH}
        postType="album"
        post={post}
        relatedPosts={relatedPosts}
        ariaLabel="교회앨범 상세"
        listButtonLabel="목록"
        detailVariant="album"
      />
      {post && <PostUtilityBar />}
    </>
  )
}

export default EventPhotoDetail
