import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

export interface MembersPaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

/** « ‹ Précédent  Page 1 sur 25  Suivant › » ; rien s'il n'y a qu'une page. */
export function MembersPagination({
  page,
  pageCount,
  onPageChange
}: MembersPaginationProps): React.JSX.Element | null {
  if (pageCount <= 1) return null
  return (
    <nav aria-label="Pages" className="flex shrink-0 items-center justify-center gap-3 text-sm">
      <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden />
        Précédent
      </Button>
      <span className="tabular-nums">
        Page {page} sur {pageCount}
      </span>
      <Button variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Suivant
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  )
}
