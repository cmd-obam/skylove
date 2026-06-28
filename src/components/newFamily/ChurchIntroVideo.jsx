import { NEW_FAMILY_VIDEO } from '@/data/newFamilyGuide'
import { PlaceholderVideo, SectionHeading } from '@/components/newFamily/shared'

function ChurchIntroVideo({
  title = NEW_FAMILY_VIDEO.title,
  description = NEW_FAMILY_VIDEO.description,
  videoUrl = NEW_FAMILY_VIDEO.videoUrl,
  thumbnail = NEW_FAMILY_VIDEO.thumbnail,
}) {
  return (
    <section className="nf-section nf-video nf-fade" aria-label="교회 소개 영상">
      <div className="nf-video__inner">
        <div className="nf-video__text">
          <SectionHeading title={title} description={description} align="left" />
        </div>
        <div className="nf-video__media">
          {videoUrl ? (
            <div className="nf-video__embed">
              <iframe
                src={videoUrl}
                title={title}
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
