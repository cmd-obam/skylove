import { Link } from 'react-router-dom'
import { FiImage } from 'react-icons/fi'
import { formatBoardDate } from '@/utils/formatBoardDate'

function BoardPostExtras({
  attachments = [],
  relatedPosts = [],
  detailPathPrefix,
}) {
  return (
    <div className="board-post-extras">
      <section className="board-post-extras__section" aria-label="첨부파일">
        <h3 className="board-post-extras__label">첨부파일</h3>
        <div className="board-post-extras__content">
          {attachments.length > 0 ? (
            <ul className="board-post-extras__files">
              {attachments.map((file) => (
                <li key={file.key || file.url || file.name} className="board-post-extras__file-item">
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

      <section className="board-post-extras__related" aria-label="관련 게시물">
        <h3 className="board-post-extras__related-title">관련 게시물</h3>
        {relatedPosts.length > 0 ? (
          <ul className="board-post-extras__related-list">
            {relatedPosts.map((relatedPost) => {
              const thumbnail = relatedPost.thumbnail || relatedPost.images?.[0]?.src
              const showImageIcon = Boolean(relatedPost.hasImage || thumbnail)

              return (
                <li key={relatedPost.id} className="board-post-extras__related-item">
                  <Link
                    to={`${detailPathPrefix}/${relatedPost.id}`}
                    className={`board-post-extras__related-card${
                      thumbnail ? '' : ' board-post-extras__related-card--text-only'
                    }`}
                  >
                    {thumbnail ? (
                      <div className="board-post-extras__related-thumb">
                        <img
                          src={thumbnail}
                          alt=""
                          className="board-post-extras__related-image"
                        />
                      </div>
                    ) : null}
                    <div className="board-post-extras__related-body">
                      <p className="board-post-extras__related-post-title">
                        {relatedPost.title}
                        {showImageIcon ? (
                          <FiImage
                            className="board-post-extras__related-image-icon"
                            aria-label="이미지 있음"
                          />
                        ) : null}
                      </p>
                      {relatedPost.eventPeriod && (
                        <p className="board-post-extras__related-period">{relatedPost.eventPeriod}</p>
                      )}
                      <p className="board-post-extras__related-date">
                        {formatBoardDate(relatedPost.date || relatedPost.createdAt)}
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
