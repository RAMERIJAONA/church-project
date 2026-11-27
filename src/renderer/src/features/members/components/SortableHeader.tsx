import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { MemberSort } from '@shared/domain/members/members.types'
import { headCell, sortButton } from './members.styles'

export interface SortableHeaderProps {
  label: string
  sortKey: MemberSort
  /** Tri en cours */
  sort: MemberSort
  order: 'asc' | 'desc'
  onSort: (sort: MemberSort) => void
}

/** En-tête de colonne triable : un clic trie, un second inverse l'ordre. */
export function SortableHeader({
  label,
  sortKey,
  sort,
  order,
  onSort
}: SortableHeaderProps): React.JSX.Element {
  const active = sort === sortKey
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={headCell()}
    >
      <button
        type="button"
        className={sortButton}
        aria-label={`${label}, trier par ${label.toLowerCase()}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon aria-hidden className={active ? 'size-3.5' : 'size-3.5 opacity-40'} />
      </button>
    </th>
  )
}
