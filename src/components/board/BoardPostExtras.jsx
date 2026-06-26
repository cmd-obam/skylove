import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBoardDate } from '@/utils/formatBoardDate'
import { isLoggedIn } from '@/utils/auth'

function BoardPostExtras({
  attachments = [],
  relatedPosts = [],
  detailPathPrefix,
  imageAttachments = [],
}) {
  const loggedIn = isLoggedIn()
  const [comment, setComment] = useState('')

  const fileList =
    attachments.length > 0
      ? attachments
      : imageAttachments.map((image, index) => ({
          name: image.name || `image-${index + 1}.jpg`,
          url: image.src,
        }))

  const handleCommentSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div className="board-post-extras">
      <section className="board-post-extras__section" aria-label="첨부파일">
        <h3 className="board-post-extras__label">첨부파일</h3>
        <div className="board-post-extras__content">
          {fileList.length > 0 ? (
            <ul className="board-post-extras__files">
              {fileList.map((file) => (
                <li key={file.name} className="board-post-extras__file-item">
                  {file.url ? (
                    <a href={file.url} className="board-post-extras__file-link" download>
                      {file.name}
                    </a>
                  ) : (
                    <span className="board-post-extras__file-name">{file.name}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="board-post-extras__empty">첨부파일이 없습니다.</p>
          )}
        </div>
      </section>

      <section
        id="board-post-comments"
        className="board-post-extras__section"
        aria-label="댓글쓰기"
      >
        <h3 className="board-post-extras__label">댓글쓰기</h3>
        <div className="board-post-extras__content">
          <form className="board-post-extras__comment-form" onSubmit={handleCommentSubmit}>
            <textarea
              id="board-post-comment"
              className="board-post-extras__comment-input"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                loggedIn
                  ? '댓글을 입력하세요.'
                  : '로그인 후 댓글 작성이 가능합니다.'
              }
              disabled={!loggedIn}
            />
            <button
              type="submit"
              className="board-post-extras__comment-submit"
              disabled={!loggedIn}
            >
              등록
            </button>
          </form>
        </div>
      </section>

      <section className="board-post-extras__related" aria-label="관련 게시물">
        <h3 className="board-post-extras__related-title">관련 게시물</h3>
        {relatedPosts.length > 0 ? (
          <ul className="board-post-extras__related-list">
            {relatedPosts.map((relatedPost) => {
              const thumbnail = relatedPost.images?.[0]

              return (
                <li key={relatedPost.id} className="board-post-extras__related-item">
                  <Link
                    to={`${detailPathPrefix}/${relatedPost.id}`}
                    className="board-post-extras__related-card"
                  >
                    <div className="board-post-extras__related-thumb">
                      {thumbnail ? (
                        <img
                          src={thumbnail.src}
                          alt={thumbnail.alt || relatedPost.title}
                          className="board-post-extras__related-image"
                        />
                      ) : (
                        <div className="board-post-extras__related-placeholder" aria-hidden="true" />
                      )}
                    </div>
                    <div className="board-post-extras__related-body">
                      <p className="board-post-extras__related-post-title">{relatedPost.title}</p>
                      {relatedPost.eventPeriod && (
                        <p className="board-post-extras__related-period">{relatedPost.eventPeriod}</p>
                      )}
                      <p className="board-post-extras__related-date">
                        {formatBoardDate(relatedPost.date)}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="board-post-extras__empty">관련 게시물이 없습니다.</p>
        )}
      </section>
    </div>
  )
}

export default BoardPostExtras
