function BoardPostTitle({ title, commentsCount }) {
  return (
    <>
      {title}
      {commentsCount > 0 && (
        <span className="board-post-title__comment-count">{` ( ${commentsCount} )`}</span>
      )}
    </>
  )
}

export default BoardPostTitle
