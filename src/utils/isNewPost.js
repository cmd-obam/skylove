export const NEW_POST_WINDOW_MS = 48 * 60 * 60 * 1000

export function isNewPost(createdAt, now = Date.now()) {
  if (!createdAt) {
    return false
  }

  const created = new Date(createdAt).getTime()

  if (Number.isNaN(created)) {
    return false
  }

  const age = now - created

  return age >= 0 && age <= NEW_POST_WINDOW_MS
}
