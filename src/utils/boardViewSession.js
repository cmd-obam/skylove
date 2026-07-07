const recordedViewKeys = new Set()

export function getBoardViewSessionKey(locationKey, postType, postId) {
  return `${locationKey}:${postType}:${String(postId)}`
}

export function hasRecordedBoardView(sessionKey) {
  return recordedViewKeys.has(sessionKey)
}

export function recordBoardView(sessionKey) {
  recordedViewKeys.add(sessionKey)
}
