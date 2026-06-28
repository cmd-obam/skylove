import { useParams } from 'react-router-dom'
import BoardPostDetail from '@/components/board/BoardPostDetail'
import { getChurchNewsPost, getRelatedChurchNewsPosts } from '@/data/churchNews'

const LIST_PATH = '/church-news'

function ChurchNewsDetail() {
  const { postId } = useParams()
  const post = getChurchNewsPost(postId)
  const relatedPosts = getRelatedChurchNewsPosts(postId)

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
