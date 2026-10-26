import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import SundayBulletin from '@/components/churchNews/SundayBulletin'
import { fetchRelatedBoardPosts } from '@/services/board/posts'
import { useBoardPostRoute } from '@/hooks/useBoardPost'
import {
  applySundayBulletinOneTimeOverride,
  parseSundayBulletinWeekly,
} from '@/utils/sundayBulletin'

const LIST_PATH = '/church-news'

function ChurchNewsDetail() {
  const { post, loading, canonicalPath } = useBoardPostRoute('church_news')
  const [relatedPosts, setRelatedPosts] = useState([])

  const bulletinWeekly = useMemo(() => {
    const parsed = parseSundayBulletinWeekly(post?.content)
    return applySundayBulletinOneTimeOverride(parsed, post?.id)
  }, [post?.content, post?.id])

  useEffect(() => {
    if (!post?.id || canonicalPath) {
      return
    }

    let isMounted = true

    async function loadRelated() {
      const related = await fetchRelatedBoardPosts('church_news', post.id)
      if (isMounted) {
        setRelatedPosts(related)
      }
    }

    loadRelated()

    return () => {
      isMounted = false
    }
  }, [canonicalPath, post?.id])

  if (loading) {
    return null
  }

  if (canonicalPath) {
    return <Navigate to={canonicalPath} replace />
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
      customBody={bulletinWeekly ? <SundayBulletin weekly={bulletinWeekly} /> : null}
    />
  )
}

export default ChurchNewsDetail
