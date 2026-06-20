import worshipImage from '@/assets/images/worship-visual.png'
import './WorshipImage.css'

function WorshipImage() {
  return (
    <figure className="worship-image">
      <div className="worship-image__frame">
        <img
          src={worshipImage}
          alt="하늘사랑감리교회 예배 안내 일러스트"
          className="worship-image__img"
        />
      </div>
    </figure>
  )
}

export default WorshipImage
