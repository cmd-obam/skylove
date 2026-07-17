/** Mirrors src/services/auth/normalizeAnswer.js */
export function normalizeAnswer(answer: unknown): string {
  if (answer == null) {
    return ''
  }

  return String(answer)
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .replace(/ {2,}/g, ' ')
    .replace(/ /g, '')
    .toLowerCase()
}
