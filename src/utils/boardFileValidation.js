export const BOARD_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const BOARD_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024

export const BOARD_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const BOARD_ATTACHMENT_MIME_TYPES = [
  ...BOARD_IMAGE_MIME_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-hwp',
  'application/haansofthwp',
  'application/vnd.hancom.hwp',
  'application/vnd.hancom.hwpx',
]

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const ATTACHMENT_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.zip',
  '.hwp',
  '.hwpx',
]

function getExtension(fileName = '') {
  const match = String(fileName).toLowerCase().match(/(\.[a-z0-9]+)$/)
  return match?.[1] ?? ''
}

export function validateBoardImageFile(file) {
  if (!file) {
    return { success: false, message: '파일이 없습니다.' }
  }

  if (file.size > BOARD_IMAGE_MAX_BYTES) {
    return { success: false, message: '이미지는 5MB 이하만 업로드할 수 있습니다.' }
  }

  const ext = getExtension(file.name)
  const mimeOk = !file.type || BOARD_IMAGE_MIME_TYPES.includes(file.type)
  const extOk = IMAGE_EXTENSIONS.includes(ext)

  if (!mimeOk && !extOk) {
    return { success: false, message: '허용되지 않는 이미지 형식입니다.' }
  }

  return { success: true }
}

export function validateBoardAttachmentFile(file) {
  if (!file) {
    return { success: false, message: '파일이 없습니다.' }
  }

  if (file.size > BOARD_ATTACHMENT_MAX_BYTES) {
    return { success: false, message: '첨부파일은 20MB 이하만 업로드할 수 있습니다.' }
  }

  const ext = getExtension(file.name)
  const mimeOk = !file.type || BOARD_ATTACHMENT_MIME_TYPES.includes(file.type)
  const extOk = ATTACHMENT_EXTENSIONS.includes(ext)

  if (!mimeOk && !extOk) {
    return { success: false, message: '허용되지 않는 첨부파일 형식입니다.' }
  }

  return { success: true }
}

export const BOARD_ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.join(',')
export const BOARD_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
