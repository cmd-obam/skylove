import BoardPostWritePage from '@/components/board/BoardPostWritePage'

function AlbumWrite() {
  return (
    <BoardPostWritePage
      postType="album"
      pageTitle="교회앨범"
      formTitle="교회앨범 등록"
      listPath="/church-news/album"
      detailPathPrefix="/church-news/album"
      mode="create"
    />
  )
}

export default AlbumWrite
