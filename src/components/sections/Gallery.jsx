import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { GALLERY_ITEMS } from '@/data/gallery'
import { fetchAlbumGalleryImages } from '@/services/board/posts'
import './Gallery.css'

const LEGACY_GALLERY_IMAGES = GALLERY_ITEMS.map((item) => ({
  id: `legacy-${item.id}`,
  src: item.image,
  alt: item.alt,
  postId: null,
}))

const DESKTOP_PAGE_SIZE = 4
const COMPACT_PAGE_SIZE = 2

function useGalleryPageSize() {
  const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 992px)')
    const update = () => {
      setPageSize(media.matches ? COMPACT_PAGE_SIZE : DESKTOP_PAGE_SIZE)
    }

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return pageSize
}

function Gallery() {
  const pageSize = useGalleryPageSize()
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [start, setStart] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchAlbumGalleryImages().then((result) => {
      if (cancelled) {
        return
      }

      setImages([...(result.images ?? []), ...LEGACY_GALLERY_IMAGES])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setStart((current) => {
      const maxStart = Math.max(0, images.length - pageSize)
      return Math.min(current, maxStart)
    })
  }, [images.length, pageSize])

  const canPage = images.length > pageSize
  const visible = images.slice(start, start + pageSize)
  const atStart = start === 0
  const atEnd = start + pageSize >= images.length

  return (
    <section className="gallery" aria-label="Gallery">
      <div className="gallery__inner">
        <div className="gallery__header">
          <h2 className="gallery__title">GALLERY</h2>
          <Link to="/church-news/album" className="gallery__more">
            + 더보기
          </Link>
        </div>

        {loading ? (
          <p className="gallery__status" role="status">
            사진을 불러오는 중...
          </p>
        ) : images.length === 0 ? (
          <p className="gallery__status">교회앨범에 등록된 사진이 없습니다.</p>
        ) : (
          <div className={`gallery__stage${canPage ? ' gallery__stage--paged' : ''}`}>
            {canPage ? (
              <button
                type="button"
                className="gallery__arrow gallery__arrow--prev"
                aria-label="이전 사진"
                disabled={atStart}
                onClick={() => setStart((current) => Math.max(0, current - pageSize))}
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
            ) : null}

            <ul className="gallery__grid">
              {visible.map((item) => (
                <li key={item.id} className="gallery__item">
                  {item.postId ? (
                    <Link to={`/church-news/album/${item.postId}`} className="gallery__frame">
                      <img src={item.src} alt={item.alt} className="gallery__image" />
                    </Link>
                  ) : (
                    <div className="gallery__frame">
                      <img src={item.src} alt={item.alt} className="gallery__image" />
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {canPage ? (
              <button
                type="button"
                className="gallery__arrow gallery__arrow--next"
                aria-label="다음 사진"
                disabled={atEnd}
                onClick={() =>
                  setStart((current) => Math.min(current + pageSize, images.length - pageSize))
                }
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

export default Gallery
