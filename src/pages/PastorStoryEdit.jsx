import { useParams } from 'react-router-dom'
import BoardPostWritePage from '@/components/board/BoardPostWritePage'
import { PASTOR_STORY_POST_TYPE } from '@/services/auth/roles'

function PastorStoryEdit() {
  const { postId } = useParams()

  return (
    <BoardPostWritePage
      postType={PASTOR_STORY_POST_TYPE}
      pageTitle="담임목사 이야기"
      formTitle="담임목사 이야기 수정"
      listPath="/church-news/pastor-story"
      detailPathPrefix="/church-news/pastor-story"
      mode="edit"
      postId={postId}
    />
  )
}

export default PastorStoryEdit
