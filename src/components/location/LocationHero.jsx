import heroImage from '@/assets/images/hero/hero01.jpg'
import './LocationHero.css'

function LocationHero() {
  return (
    <section className="location-intro" aria-label="찾아오시는 길 안내">
      <p className="location-intro__eyebrow">Welcome to Haneulsarang</p>
      <figure className="location-intro__figure">
        <img
          src={heroImage}
          alt="하늘사랑교회 건물 전경"
          className="location-intro__image"
        />
      </figure>
    </section>
  )
}

export default LocationHero
