import SundayBulletinWritePage from '@/components/churchNews/SundayBulletinWritePage'

function ChurchNewsWrite() {
  return (
    <SundayBulletinWritePage
      pageTitle="교회소식"
      formTitle="주일예배 주보 작성"
      listPath="/church-news"
      detailPathPrefix="/church-news"
      mode="create"
    />
  )
}

export default ChurchNewsWrite
