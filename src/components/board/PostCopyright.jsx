import { COPYRIGHT_NOTICE } from '@/constants/siteCopyright'
import './PostCopyright.css'

function PostCopyright() {
  const { church, english, homepage, year, lines } = COPYRIGHT_NOTICE

  return (
    <aside className="post-copyright" aria-label="저작권 안내">
      <p className="post-copyright__owner">
        © {year} {church}({english})
      </p>

      <div className="post-copyright__body">
        {lines.map((line, index) =>
          line ? (
            <p key={`copyright-line-${index}`}>{line}</p>
          ) : (
            <div key={`copyright-spacer-${index}`} className="post-copyright__spacer" />
          ),
        )}
      </div>

      <a
        className="post-copyright__link"
        href={homepage}
        target="_blank"
        rel="noopener noreferrer"
      >
        {homepage}
      </a>
    </aside>
  )
}

export default PostCopyright
