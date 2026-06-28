import { useEffect, useMemo, useState } from 'react'
import {
  buildBirthDate,
  clampBirthDateDay,
  getBirthDateDayRange,
  getBirthDateYearRange,
  splitBirthDate,
} from '@/utils/birthDateSelect'

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

function BirthDateSelect({ idPrefix = 'signup-birth', value, onChange }) {
  const [parts, setParts] = useState(() => splitBirthDate(value))
  const years = useMemo(() => getBirthDateYearRange(), [])
  const days = useMemo(
    () => getBirthDateDayRange(parts.year, parts.month),
    [parts.year, parts.month],
  )

  useEffect(() => {
    setParts(splitBirthDate(value))
  }, [value])

  const updatePart = (key, nextValue) => {
    const nextParts = { ...parts, [key]: nextValue }

    if (key === 'year' || key === 'month') {
      nextParts.day = clampBirthDateDay(nextParts.year, nextParts.month, nextParts.day)
    }

    setParts(nextParts)
    onChange(buildBirthDate(nextParts.year, nextParts.month, nextParts.day))
  }

  return (
    <div className="signup-birth-date">
      <select
        id={`${idPrefix}-year`}
        name="birthDateYear"
        className={`signup-birth-date__select${
          parts.year ? '' : ' signup-birth-date__select--placeholder'
        }`}
        value={parts.year}
        onChange={(event) => updatePart('year', event.target.value)}
        aria-label="연도"
      >
        <option value="" disabled>
          연도
        </option>
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </select>

      <select
        id={`${idPrefix}-month`}
        name="birthDateMonth"
        className={`signup-birth-date__select${
          parts.month ? '' : ' signup-birth-date__select--placeholder'
        }`}
        value={parts.month}
        onChange={(event) => updatePart('month', event.target.value)}
        aria-label="월"
      >
        <option value="" disabled>
          월
        </option>
        {MONTHS.map((month) => (
          <option key={month} value={String(month)}>
            {month}월
          </option>
        ))}
      </select>

      <select
        id={`${idPrefix}-day`}
        name="birthDateDay"
        className={`signup-birth-date__select${
          parts.day ? '' : ' signup-birth-date__select--placeholder'
        }`}
        value={parts.day}
        onChange={(event) => updatePart('day', event.target.value)}
        disabled={!parts.year || !parts.month}
        aria-label="일"
      >
        <option value="" disabled>
          일
        </option>
        {days.map((day) => (
          <option key={day} value={String(day)}>
            {day}일
          </option>
        ))}
      </select>
    </div>
  )
}

export default BirthDateSelect
