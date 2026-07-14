import BoardPostWritePage from '@/components/board/BoardPostWritePage'
import { getWorshipWordBoard } from '@/data/worshipWord'

function WorshipWordWrite({ boardKey, mode = 'create', postId = null }) {
  const board = getWorshipWordBoard(boardKey)

  return (
    <BoardPostWritePage
      postType={board.postType}
      pageTitle={board.title}
      formTitle={mode === 'edit' ? board.formTitleEdit : board.formTitleCreate}
      listPath={board.listPath}
      detailPathPrefix={board.listPath}
      mode={mode}
      postId={postId}
      writeVariant="video"
    />
  )
}

export default WorshipWordWrite
