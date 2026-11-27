import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { HOUSEHOLDS_PAGE_SIZE } from '@shared/domain/members/households.types'
import { HouseholdFormDialog } from '../components/HouseholdFormDialog'
import { HouseholdsTable } from '../components/HouseholdsTable'
import { HouseholdsToolbar } from '../components/HouseholdsToolbar'
import { MembersPagination } from '../components/MembersPagination'
import { clampPage, countLabel, pageCount } from '../members.utils'
import { useCreateHousehold, useHouseholds, useSectors, useSponsorCandidates } from '../queries'
import { SEARCH_DEBOUNCE_MS } from '../use-members-list-state'
import { useDebouncedValue } from '../use-debounced-value'

/** Foyers : liste filtrable ; un nouveau foyer s'ouvre aussitôt pour y ajouter ses membres. */
export function HouseholdsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [search, setSearchText] = useState('')
  const [sectorId, setSectorIdValue] = useState<number | undefined>(undefined)
  const [sponsorMissing, setSponsorMissingValue] = useState(false)
  const [requestedPage, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [sponsorSearch, setSponsorSearch] = useState('')
  const query = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const sponsorQuery = useDebouncedValue(sponsorSearch, SEARCH_DEBOUNCE_MS)

  const [total, setTotal] = useState<number | undefined>(undefined)
  const page =
    total === undefined ? requestedPage : clampPage(requestedPage, total, HOUSEHOLDS_PAGE_SIZE)
  if (page !== requestedPage) setPage(page)

  const households = useHouseholds({ search: query, sectorId, sponsorMissing, page })
  const sectors = useSectors()
  const sponsors = useSponsorCandidates(sponsorQuery, creating)
  const create = useCreateHousehold()
  const data = households.data
  if (data && data.total !== total) setTotal(data.total)

  // Tout changement de recherche ou de filtre revient en page 1
  const resetting =
    <T,>(set: (v: T) => void) =>
    (v: T): void => {
      set(v)
      setPage(1)
    }

  return (
    <div className="flex h-full flex-col gap-4">
      <HouseholdsToolbar
        search={search}
        onSearchChange={resetting(setSearchText)}
        sectors={sectors.data ?? []}
        sectorId={sectorId}
        onSectorChange={resetting(setSectorIdValue)}
        sponsorMissing={sponsorMissing}
        onSponsorMissingChange={resetting(setSponsorMissingValue)}
        onCreate={() => {
          setServerError(null)
          setCreating(true)
        }}
        resultLabel={data ? countLabel(data.total, 'foyer', 'foyers') : ''}
      />

      {households.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {households.isError && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {getErrorMessage(households.error)}
          <Button variant="outline" size="sm" onClick={() => void households.refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {data && data.total === 0 && (
        <p className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {query.trim() || sectorId !== undefined || sponsorMissing
            ? 'Aucun foyer ne correspond.'
            : 'Aucun foyer. Créez un foyer, puis ajoutez-y ses membres.'}
        </p>
      )}
      {data && data.items.length > 0 && (
        <>
          <HouseholdsTable households={data.items} onOpen={(h) => navigate(`/foyers/${h.id}`)} />
          <MembersPagination
            page={page}
            pageCount={pageCount(data.total, HOUSEHOLDS_PAGE_SIZE)}
            onPageChange={setPage}
          />
        </>
      )}

      <HouseholdFormDialog
        open={creating}
        initial={null}
        sectors={sectors.data ?? []}
        sponsorOptions={sponsors.data ?? []}
        onSponsorSearch={setSponsorSearch}
        submitting={create.isPending}
        serverError={serverError}
        onSubmit={(values) =>
          create.mutate(values, {
            onSuccess: (household) => {
              toast.success(`Foyer ${household.number} créé`)
              setCreating(false)
              navigate(`/foyers/${household.id}?ajout=1`)
            },
            onError: (err) => setServerError(getErrorMessage(err))
          })
        }
        onCancel={() => setCreating(false)}
      />
    </div>
  )
}
