import introPanel from '@/assets/images/newFamily/church-intro-panel.png'
import { NEW_FAMILY_VIDEO } from '@/data/newFamilyGuide'
import { PlaceholderVideo } from '@/components/newFamily/shared'
import './ChurchIntroVideo.css'

function ChurchIntroVideo({
  introImage = NEW_FAMILY_VIDEO.introImage ?? introPanel,
  videoUrl = NEW_FAMILY_VIDEO.videoUrl,
  thumbnail = NEW_FAMILY_VIDEO.thumbnail,
  videoTitle = NEW_FAMILY_VIDEO.videoTitle,
}) {
  return (
    <section className="nf-section nf-video nf-fade" aria-label="교회 소개 영상">
      <div className="nf-video__inner">
        <div className="nf-video__panel">
          <img
            src={introImage}
            alt="오직 예수로 세워지는 하늘사랑교회. 예수 그리스도를 중심에 두고 말씀과 사랑으로 걸어가는 하늘사랑교회를 만나보세요."
            className="nf-video__panel-image"
            loading="lazy"
          />
        </div>
        <div className="nf-video__media">
          {videoUrl ? (
            <div className="nf-video__embed">
              <iframe
                src={videoUrl}
                title={videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <PlaceholderVideo label="영상 영역" thumbnail={thumbnail} />
          )}
        </div>
      </div>
    </section>
  )
}

export default ChurchIntroVideo
