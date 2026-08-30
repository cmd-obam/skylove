import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import BoardPostWritePage from '@/components/board/BoardPostWritePage'
import SundayBulletinWritePage from '@/components/churchNews/SundayBulletinWritePage'
import { fetchBoardPost } from '@/services/board/posts'
import { isSundayBulletinContent } from '@/utils/sundayBulletin'

function ChurchNewsEdit() {
  const { postId } = useParams()
  const [mode, setMode] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function detectFormat() {
      const result = await fetchBoardPost('church_news', postId)

      if (!isMounted) {
        return
      }

      if (!result.success || !result.post) {
        setMode('legacy')
        return
      }

      setMode(isSundayBulletinContent(result.post.content) ? 'bulletin' : 'legacy')
    }

    detectFormat()

    return () => {
      isMounted = false
    }
  }, [postId])

  if (mode === 'loading') {
    return null
  }

  if (mode === 'bulletin') {
    return (
      <SundayBulletinWritePage
        pageTitle="교회소식"
        formTitle="주일예배 주보 수정"
        listPath="/church-news"
        detailPathPrefix="/church-news"
        mode="edit"
        postId={postId}
      />
    )
  }

  return (
    <BoardPostWritePage
      postType="church_news"
      pageTitle="교회소식"
      formTitle="교회소식 수정"
      listPath="/church-news"
      detailPathPrefix="/church-news"
      mode="edit"
      postId={postId}
    />
  )
}

export default ChurchNewsEdit
