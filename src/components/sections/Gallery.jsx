import { Link } from 'react-router-dom'
import { GALLERY_ITEMS } from '@/data/gallery'
import './Gallery.css'

function Gallery() {
  return (
    <section className="gallery" aria-label="Gallery">
      <div className="gallery__inner">
        <div className="gallery__header">
          <h2 className="gallery__title">GALLERY</h2>
          <Link to="/church-life/album" className="gallery__more">
            + 더보기
          </Link>
        </div>
        <ul className="gallery__grid">
          {GALLERY_ITEMS.map((item) => (
            <li key={item.id} className="gallery__item">
              <div className="gallery__frame">
                {item.image ? (
                  <img src={item.image} alt={item.alt} className="gallery__image" />
                ) : (
                  <div className="gallery__placeholder" aria-label={item.alt}>
                    <span className="gallery__placeholder-text">Image</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Gallery
