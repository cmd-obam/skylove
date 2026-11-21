import { AUTOCOMPLETE_OFF } from '@/constants/autocomplete'
import {
  PRAYER_CATEGORY_FILTERS,
  PRAYER_STATUS_FILTERS,
  PRAYER_VISIBILITY_FILTERS,
} from '@/services/prayer/present'

function FilterGroup({ label, value, options, onChange }) {
  return (
    <div className="prayer-filters" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="prayer-filters__button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function PrayerFilters({
  category,
  status,
  visibility,
  showVisibility,
  keyword,
  onCategoryChange,
  onStatusChange,
  onVisibilityChange,
  onKeywordChange,
  onSearch,
}) {
  return (
    <div className="prayer-filter-bar">
      <div className="prayer-filter-block">
        <p className="prayer-filter-label">카테고리</p>
        <FilterGroup
          label="기도 제목 카테고리"
          value={category}
          options={PRAYER_CATEGORY_FILTERS}
          onChange={onCategoryChange}
        />
      </div>
      <div className="prayer-filter-tools">
        <div className="prayer-filter-block">
          <p className="prayer-filter-label">기도 상태</p>
          <FilterGroup
            label="기도 상태"
            value={status}
            options={PRAYER_STATUS_FILTERS}
            onChange={onStatusChange}
          />
        </div>
        {showVisibility ? (
          <div className="prayer-filter-block">
            <p className="prayer-filter-label">공개 범위</p>
            <FilterGroup
              label="공개 범위"
              value={visibility}
              options={PRAYER_VISIBILITY_FILTERS}
              onChange={onVisibilityChange}
            />
          </div>
        ) : null}
        <form className="prayer-search" onSubmit={onSearch}>
          <label className="prayer-search__label" htmlFor="prayer-search">
            검색
          </label>
          <input
            id="prayer-search"
            className="prayer-search__input"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="제목 또는 내용"
            autoComplete={AUTOCOMPLETE_OFF}
            maxLength={80}
          />
          <button type="submit" className="prayer-button prayer-button--search">
            검색
          </button>
        </form>
      </div>
    </div>
  )
}

export default PrayerFilters
