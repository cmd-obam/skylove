function BoardPostTitle({ title, commentsCount }) {
  const count = Number.isFinite(Number(commentsCount)) ? Number(commentsCount) : 0

  return (
    <>
      {title}
      <span className="board-post-title__comment-count">{` (${count})`}</span>
    </>
  )
}

export default BoardPostTitle
