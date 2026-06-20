import locationHero from '@/assets/images/location/location-hero.png'
import './LocationHero.css'

function LocationHero() {
  return (
    <figure className="location-hero">
      <img
        src={locationHero}
        alt="하늘사랑교회 오시는 길 안내"
        className="location-hero__img"
      />
    </figure>
  )
}

export default LocationHero
