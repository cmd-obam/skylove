import { useParams } from 'react-router-dom'
import BoardPostWritePage from '@/components/board/BoardPostWritePage'

function AlbumEdit() {
  const { postId } = useParams()

  return (
    <BoardPostWritePage
      postType="album"
      pageTitle="교회앨범"
      formTitle="교회앨범 수정"
      listPath="/church-news/album"
      detailPathPrefix="/church-news/album"
      mode="edit"
      postId={postId}
    />
  )
}

export default AlbumEdit
