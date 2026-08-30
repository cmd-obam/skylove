import BoardPostWritePage from '@/components/board/BoardPostWritePage'

function ChurchNewsWrite() {
  return (
    <BoardPostWritePage
      postType="church_news"
      pageTitle="교회소식"
      formTitle="교회소식 글쓰기"
      listPath="/church-news"
      detailPathPrefix="/church-news"
      mode="create"
      enableBulletinTemplate
    />
  )
}

export default ChurchNewsWrite
