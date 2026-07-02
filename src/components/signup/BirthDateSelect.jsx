import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  buildBirthDate,
  clampBirthDateDay,
  getBirthDateDayRange,
  getBirthDateYearRange,
  splitBirthDate,
} from '@/utils/birthDateSelect'

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

function BirthDateDropdown({
  id,
  name,
  placeholder,
  value,
  options,
  disabled = false,
  onChange,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (nextValue) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div
      className={`signup-birth-date__dropdown${open ? ' signup-birth-date__dropdown--open' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={id}
        name={name}
        className={`signup-birth-date__select${
          value ? '' : ' signup-birth-date__select--placeholder'
        }`}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current)
          }
        }}
      >
        {selectedOption?.label ?? placeholder}
      </button>

      {open && (
        <ul className="signup-birth-date__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <li key={option.value || option.label} role="none">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`signup-birth-date__option${
                  option.value === value ? ' signup-birth-date__option--selected' : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BirthDateSelect({ idPrefix = 'signup-birth', value, onChange, className = '' }) {
  const fallbackId = useId()
  const fieldIdPrefix = idPrefix || fallbackId.replace(/:/g, '')
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

  const yearOptions = years.map((year) => ({
    value: String(year),
    label: String(year),
  }))

  const monthOptions = MONTHS.map((month) => ({
    value: String(month),
    label: `${month}월`,
  }))

  const dayOptions = days.map((day) => ({
    value: String(day),
    label: `${day}일`,
  }))

  return (
    <div className={`signup-birth-date ${className}`.trim()}>
      <BirthDateDropdown
        id={`${fieldIdPrefix}-year`}
        name="birthDateYear"
        placeholder="연도"
        value={parts.year}
        options={yearOptions}
        onChange={(nextValue) => updatePart('year', nextValue)}
        ariaLabel="연도"
      />

      <BirthDateDropdown
        id={`${fieldIdPrefix}-month`}
        name="birthDateMonth"
        placeholder="월"
        value={parts.month}
        options={monthOptions}
        onChange={(nextValue) => updatePart('month', nextValue)}
        ariaLabel="월"
      />

      <BirthDateDropdown
        id={`${fieldIdPrefix}-day`}
        name="birthDateDay"
        placeholder="일"
        value={parts.day}
        options={dayOptions}
        disabled={!parts.year || !parts.month}
        onChange={(nextValue) => updatePart('day', nextValue)}
        ariaLabel="일"
      />
    </div>
  )
}

export default BirthDateSelect
