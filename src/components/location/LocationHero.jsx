import heroImage from '@/assets/images/hero/hero01.jpg'
import './LocationHero.css'

function LocationHero() {
  return (
    <section className="location-intro" aria-labelledby="location-intro-title">
      <div className="location-intro__content">
        <p className="location-intro__eyebrow">Welcome to Haneulsarang</p>
        <h1 id="location-intro-title" className="location-intro__title">
          찾아오시는 길
        </h1>
        <p className="location-intro__desc">
          하늘사랑교회는 언제나 여러분을 기다리고 있습니다.
        </p>
      </div>
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
