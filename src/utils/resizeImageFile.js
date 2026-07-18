/**
 * Resize an image File/Blob via canvas. Returns a JPEG File.
 */
export async function resizeImageFile(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.85, fileName } = {}) {
  if (!file || !file.type?.startsWith('image/')) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('이미지 변환에 실패했습니다.'))
        }
      },
      'image/jpeg',
      quality,
    )
  })

  const baseName = (fileName || file.name || 'image.jpg').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}

export async function resizeThumbnailFile(file) {
  return resizeImageFile(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
    fileName: 'thumb.jpg',
  })
}
