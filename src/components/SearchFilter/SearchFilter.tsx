import type { SearchFilter as SearchFilterType, TaskStatus } from '../../types'
import { allCategories } from '../../utils/tasks'
import './SearchFilter.css'

type Props = {
  filter: SearchFilterType
  onFilterChange: (filter: SearchFilterType) => void
  availableTags: string[]
}

const statuses: Array<TaskStatus | 'All'> = ['All', 'Not started', 'In progress', 'Blocked', 'Scheduled', 'Done']

export function SearchFilterBar({ filter, onFilterChange }: Omit<Props, 'availableTags'>) {
  return (
    <div className="search-filter-bar">
      <input
        className="search-input"
        onChange={(e) => onFilterChange({ ...filter, query: e.target.value })}
        placeholder="Search tasks..."
        type="search"
        value={filter.query}
      />
      <select
        className="filter-select"
        onChange={(e) => onFilterChange({ ...filter, status: e.target.value as TaskStatus | 'All' })}
        value={filter.status}
        aria-label="Filter by status"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        className="filter-select"
        onChange={(e) => onFilterChange({ ...filter, category: e.target.value })}
        value={filter.category}
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        className="filter-date"
        onChange={(e) => onFilterChange({ ...filter, dateFrom: e.target.value })}
        type="date"
        value={filter.dateFrom}
        aria-label="From date"
      />
      <input
        className="filter-date"
        onChange={(e) => onFilterChange({ ...filter, dateTo: e.target.value })}
        type="date"
        value={filter.dateTo}
        aria-label="To date"
      />
    </div>
  )
}
