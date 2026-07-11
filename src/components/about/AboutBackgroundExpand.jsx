import aboutIntroBg from '@/assets/images/about/about-intro-bg.png'
import MobileBannerExpand from '@/components/common/MobileBannerExpand'
import './AboutBackgroundExpand.css'

function AboutBackgroundExpand({ imageSrc = aboutIntroBg }) {
  return (
    <MobileBannerExpand
      imageSrc={imageSrc}
      imageAlt="교회 소개 배경"
      previewMode="background"
      className="about-bg-expand"
      style={{ '--about-intro-bg': `url(${imageSrc})` }}
    >
      <div className="about-bg-expand__layer" aria-hidden="true" />
    </MobileBannerExpand>
  )
}

export default AboutBackgroundExpand
