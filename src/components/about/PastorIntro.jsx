import pastorPhoto from '@/assets/images/about/pastor.png'
import './PastorIntro.css'

function PastorIntro() {
  return (
    <div className="pastor-intro">
      <figure className="pastor-intro__photo-wrap">
        <img
          src={pastorPhoto}
          alt="하늘사랑교회 담임목사"
          className="pastor-intro__photo"
        />
      </figure>

      <div className="pastor-intro__content">
        <p className="pastor-intro__greeting">주님의 평강이 함께하시길 기도합니다.</p>
        <h2 className="pastor-intro__name">담임목사 OOO</h2>
        <div className="pastor-intro__body">
          <p>
            하늘사랑교회 홈페이지를 방문해 주셔서 감사합니다. 저희 교회는 하나님을 만나
            사람이 행복한 교회를 지향하며, 말씀과 기도, 사랑의 공동체로 세상을 섬기고
            있습니다.
          </p>
          <p>
            이곳에 담임목사에 대한 소개 글을 작성해 주세요. 사역 철학, 신앙 고백, 교회를
            향한 메시지 등을 자유롭게 기록하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PastorIntro
