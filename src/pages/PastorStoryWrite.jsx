import BoardPostWritePage from '@/components/board/BoardPostWritePage'
import { PASTOR_STORY_POST_TYPE } from '@/services/auth/roles'

function PastorStoryWrite() {
  return (
    <BoardPostWritePage
      postType={PASTOR_STORY_POST_TYPE}
      pageTitle="담임목사 이야기"
      formTitle="담임목사 이야기 글쓰기"
      listPath="/church-news/pastor-story"
      detailPathPrefix="/church-news/pastor-story"
      mode="create"
    />
  )
}

export default PastorStoryWrite
