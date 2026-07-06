import Breadcrumb from '@/components/Breadcrumb'
import { FACILITIES_GUIDE } from '@/data/facilitiesGuide'
import './FacilitiesGuide.css'

function FacilityImageGrid({ images, label, placeholderText = '이미지 영역' }) {
  return (
    <ul className="facilities__gallery">
      {images.map((src, index) => (
        <li key={`${label}-${index}`} className="facilities__gallery-item">
          {src ? (
            <img
              src={src}
              alt={`${label} ${index + 1}`}
              className="facilities__gallery-image"
              loading="lazy"
            />
          ) : (
            <div
              className="facilities__gallery-slot"
              role="img"
              aria-label={`${label} ${placeholderText}`}
            >
              <span className="facilities__gallery-slot-text">{placeholderText}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function FacilitiesGuide({
  pageTitle = FACILITIES_GUIDE.pageTitle,
  sections = FACILITIES_GUIDE.sections,
}) {
  return (
    <article className="facilities">
      <div className="facilities__top">
        <Breadcrumb />
      </div>

      <header className="facilities__page-header">
        <h1 className="facilities__page-title">{pageTitle}</h1>
        <div className="facilities__page-divider" aria-hidden="true">
          <span className="facilities__page-divider-line" />
          <span className="facilities__page-divider-dot" />
          <span className="facilities__page-divider-line" />
        </div>
      </header>

      <div className="facilities__sections">
        {sections.map((section) => (
          <section
            key={section.id}
            className="facilities__section"
            aria-labelledby={`facilities-section-${section.id}`}
          >
            <h2 id={`facilities-section-${section.id}`} className="facilities__section-title">
              {section.title}
            </h2>

            {section.subsections ? (
              <div className="facilities__subsections">
                {section.subsections.map((subsection) => (
                  <div key={subsection.id} className="facilities__subsection">
                    <h3 className="facilities__subsection-title">{subsection.label}</h3>
                    <FacilityImageGrid
                      images={subsection.images}
                      label={subsection.label}
                      placeholderText={subsection.placeholderText}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <FacilityImageGrid images={section.images} label={section.title} />
            )}
          </section>
        ))}
      </div>
    </article>
  )
}

export default FacilitiesGuide
