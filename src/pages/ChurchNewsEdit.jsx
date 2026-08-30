import { useParams } from 'react-router-dom'
import BoardPostWritePage from '@/components/board/BoardPostWritePage'

function ChurchNewsEdit() {
  const { postId } = useParams()

  return (
    <BoardPostWritePage
      postType="church_news"
      pageTitle="교회소식"
      formTitle="교회소식 수정"
      listPath="/church-news"
      detailPathPrefix="/church-news"
      mode="edit"
      postId={postId}
      enableBulletinTemplate
    />
  )
}

export default ChurchNewsEdit
