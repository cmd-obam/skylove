import { NEW_FAMILY_VIDEO } from '@/data/newFamilyGuide'
import { PlaceholderVideo } from '@/components/newFamily/shared'
import './ChurchIntroVideo.css'

function ChurchLineArt() {
  return (
    <svg
      className="nf-video__intro-art"
      viewBox="0 0 120 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4 58h112" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M28 58V38l14-10 14 10v20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M42 28V14l-4-6h8l-4 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M42 12v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="42" cy="46" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M68 58V42c0-4 3-7 7-7s7 3 7 7v16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M82 35c2-4 5-6 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChurchIntroVideo({
  titleLine1 = NEW_FAMILY_VIDEO.titleLine1,
  titleLine2 = NEW_FAMILY_VIDEO.titleLine2,
  descriptionLines = NEW_FAMILY_VIDEO.descriptionLines,
  videoUrl = NEW_FAMILY_VIDEO.videoUrl,
  thumbnail = NEW_FAMILY_VIDEO.thumbnail,
}) {
  const videoTitle = `${titleLine1} ${titleLine2}`

  return (
    <section className="nf-section nf-video nf-fade" aria-label="교회 소개 영상">
      <div className="nf-video__inner">
        <div className="nf-video__text">
          <div className="nf-video__intro">
            <div className="nf-video__intro-copy">
              <h2 className="nf-video__intro-title">
                <span className="nf-video__intro-title-line">{titleLine1}</span>
                <span className="nf-video__intro-title-main">
                  {titleLine2}
                  <span className="nf-video__intro-heart" aria-hidden="true">
                    💛
                  </span>
                </span>
              </h2>
              <p className="nf-video__intro-desc">
                {descriptionLines.map((line) => (
                  <span key={line} className="nf-video__intro-desc-line">
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <ChurchLineArt />
          </div>
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
