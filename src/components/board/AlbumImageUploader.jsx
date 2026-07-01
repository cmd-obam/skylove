import { FiChevronLeft, FiChevronRight, FiTrash2, FiX } from 'react-icons/fi'

function AlbumImageUploader({ images, onChange, disabled = false }) {
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files ?? [])

    if (files.length === 0) {
      return
    }

    const nextImages = [
      ...images,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        alt: file.name,
      })),
    ]

    onChange(nextImages)
    event.target.value = ''
  }

  const handleRemove = (key) => {
    const target = images.find((image) => image.key === key)

    if (target?.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(target.preview)
    }

    onChange(images.filter((image) => image.key !== key))
  }

  const handleMove = (index, direction) => {
    const nextIndex = index + direction

    if (nextIndex < 0 || nextIndex >= images.length) {
      return
    }

    const nextImages = [...images]
    const [moved] = nextImages.splice(index, 1)
    nextImages.splice(nextIndex, 0, moved)
    onChange(nextImages)
  }

  return (
    <div className="album-image-uploader">
      <label className="board-write-form__file-button">
        <input
          type="file"
          accept="image/*"
          multiple
          className="visually-hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        사진 추가
      </label>

      {images.length > 0 && (
        <ul className="album-image-uploader__list">
          {images.map((image, index) => (
            <li key={image.key} className="album-image-uploader__item">
              <div className="album-image-uploader__preview-wrap">
                <img
                  src={image.preview || image.url}
                  alt={image.alt || `사진 ${index + 1}`}
                  className="album-image-uploader__preview"
                />
                {index === 0 && (
                  <span className="album-image-uploader__badge">대표</span>
                )}
              </div>
              <div className="album-image-uploader__actions">
                <button
                  type="button"
                  className="album-image-uploader__action"
                  onClick={() => handleMove(index, -1)}
                  disabled={disabled || index === 0}
                  aria-label="왼쪽으로 이동"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="album-image-uploader__action"
                  onClick={() => handleMove(index, 1)}
                  disabled={disabled || index === images.length - 1}
                  aria-label="오른쪽으로 이동"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="album-image-uploader__action album-image-uploader__action--danger"
                  onClick={() => handleRemove(image.key)}
                  disabled={disabled}
                  aria-label="사진 삭제"
                >
                  <FiTrash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 && (
        <p className="board-write-form__hint">여러 장의 사진을 업로드할 수 있습니다.</p>
      )}
    </div>
  )
}

export function revokeAlbumImagePreviews(images) {
  images.forEach((image) => {
    if (image.preview?.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview)
    }
  })
}

export default AlbumImageUploader
