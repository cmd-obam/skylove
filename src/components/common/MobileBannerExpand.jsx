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
  previewMode = 'banner',
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

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  return (
    <>
      <div
        className={`mobile-banner-expand mobile-banner-expand--${previewMode} ${className}`.trim()}
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

      {open && imageSrc ? (
        <MobileImageLightbox imageSrc={imageSrc} imageAlt={imageAlt} onClose={handleClose}>
          {previewMode === 'banner' && children ? (
            <div className={`mobile-banner-expand__lightbox-text ${lightboxContentClassName}`.trim()}>
              {children}
            </div>
          ) : null}
        </MobileImageLightbox>
      ) : null}
    </>
  )
}

export default MobileBannerExpand
