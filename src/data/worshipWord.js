export const WORSHIP_WORD_POST_TYPES = {
  SUNDAY: 'sunday_sermon',
  EL_SHADDAI: 'el_shaddai_choir',
}

export const WORSHIP_WORD_BOARDS = {
  sunday: {
    key: 'sunday',
    postType: WORSHIP_WORD_POST_TYPES.SUNDAY,
    title: '주일예배',
    description: '주일예배 말씀을 영상으로 나눕니다.',
    listPath: '/worship-word/sunday',
    writePath: '/worship-word/sunday/write',
    editPath: (postId) => `/worship-word/sunday/edit/${postId}`,
    formTitleCreate: '주일예배 등록',
    formTitleEdit: '주일예배 수정',
  },
  'el-shaddai': {
    key: 'el-shaddai',
    postType: WORSHIP_WORD_POST_TYPES.EL_SHADDAI,
    title: '엘샤다이 찬양단',
    description: '엘샤다이 찬양단 영상을 나눕니다.',
    listPath: '/worship-word/el-shaddai',
    writePath: '/worship-word/el-shaddai/write',
    editPath: (postId) => `/worship-word/el-shaddai/edit/${postId}`,
    formTitleCreate: '엘샤다이 찬양단 등록',
    formTitleEdit: '엘샤다이 찬양단 수정',
  },
}

export function getWorshipWordBoard(key) {
  return WORSHIP_WORD_BOARDS[key] ?? null
}

export function getWorshipWordBoardByPostType(postType) {
  return (
    Object.values(WORSHIP_WORD_BOARDS).find((board) => board.postType === postType) ?? null
  )
}

export function isWorshipWordPostType(postType) {
  return Object.values(WORSHIP_WORD_POST_TYPES).includes(postType)
}
