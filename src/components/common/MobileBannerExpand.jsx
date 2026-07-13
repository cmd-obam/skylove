import { useState } from 'react'
import useIsMobile from '@/hooks/useIsMobile'
import MobileImageLightbox from '@/components/common/MobileImageLightbox'
import './MobileBannerExpand.css'
import './MobileImageLightbox.css'

function MobileBannerExpand({
  imageSrc,
  imageAlt = '',
  className = '',
  style,
  previewClassName = '',
  lightboxContentClassName = '',
  lightboxChildren,
  previewMode = 'banner',
  lightboxLayout = 'stacked',
  lightboxBannerClassName = 'worship-template__intro--banner-lightbox',
  showHeadlineOverlay = true,
  children,
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (!isMobile) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  if (!showHeadlineOverlay) {
    return (
      <div
        className={`mobile-banner-expand mobile-banner-expand--title-only ${className}`.trim()}
        style={style}
      >
        {children}
      </div>
    )
  }

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)
  const lightboxContent = lightboxChildren ?? children

  return (
    <>
      <div
        className={`mobile-banner-expand mobile-banner-expand--${previewMode}${
          showHeadlineOverlay ? '' : ' mobile-banner-expand--no-headline-overlay'
        } ${className}`.trim()}
        style={style}
      >
        <div className={`mobile-banner-expand__preview ${previewClassName}`.trim()}>
          {previewMode === 'background' ? (
            children
          ) : (
            <button
              type="button"
              className="mobile-banner-expand__preview-hit"
              onClick={handleOpen}
              aria-label="이미지 크게 보기"
            >
              {children}
            </button>
          )}
        </div>
        <button type="button" className="mobile-banner-expand__trigger" onClick={handleOpen}>
          이미지 크게 보기
        </button>
      </div>

      {open && (imageSrc || lightboxLayout === 'overlay') ? (
        <MobileImageLightbox
          imageSrc={imageSrc}
          imageAlt={imageAlt}
          layout={lightboxLayout}
          onClose={handleClose}
        >
          {lightboxLayout === 'overlay' && lightboxContent ? (
            <div className={`${className} ${lightboxBannerClassName}`.trim()} style={style}>
              {lightboxContent}
            </div>
          ) : showHeadlineOverlay && previewMode === 'banner' && lightboxContent ? (
            <div className={`mobile-banner-expand__lightbox-text ${lightboxContentClassName}`.trim()}>
              {lightboxContent}
            </div>
          ) : null}
        </MobileImageLightbox>
      ) : null}
    </>
  )
}

export default MobileBannerExpand
