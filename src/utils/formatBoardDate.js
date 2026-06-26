export function formatBoardDate(date) {
  if (!date) {
    return ''
  }

  if (/^\d{2}\.\d{2}\.\d{2}$/.test(date)) {
    return date
  }

  const dottedMatch = date.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)

  if (dottedMatch) {
    return `${dottedMatch[1].slice(-2)}.${dottedMatch[2]}.${dottedMatch[3]}`
  }

  const parsedDate = new Date(date)

  if (!Number.isNaN(parsedDate.getTime())) {
    const year = String(parsedDate.getFullYear()).slice(-2)
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')

    return `${year}.${month}.${day}`
  }

  return date
}
