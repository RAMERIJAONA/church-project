import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { MEMBERS_PAGE_SIZE, type MemberDTO } from '@shared/domain/members/members.types'
import { MembersEmptyState } from '../components/MembersEmptyState'
import { MembersPagination } from '../components/MembersPagination'
import { MembersTable } from '../components/MembersTable'
import { MembersToolbar } from '../components/MembersToolbar'
import { pageCount, resultLabel } from '../members.utils'
import { useMembers } from '../queries'
import { useMembersListState } from '../use-members-list-state'

/** Boîte ouverte : ajout, modification ou confirmation de suppression. */
export type MemberDialog =
  { kind: 'create' } | { kind: 'edit'; member: MemberDTO } | { kind: 'delete'; member: MemberDTO }

/** Fidèles : liste paginée, recherche en temps réel, ajout / modification / suppression. */
export function MembersPage(): React.JSX.Element {
  const [total, setTotal] = useState<number | undefined>(undefined)
  const list = useMembersListState(total)
  const members = useMembers(list.query, list.page)
  const [, setDialog] = useState<MemberDialog | null>(null)

  const data = members.data
  // Total de la dernière réponse, pour ramener la page sur la dernière existante (mise à jour
  // pendant le rendu : motif React « valeur dérivée du rendu précédent », sans effet)
  if (data && data.total !== total) setTotal(data.total)
  const searching = list.query.trim() !== ''
  const openCreate = (): void => setDialog({ kind: 'create' })

  return (
    <div className="flex flex-col gap-4">
      <MembersToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onAdd={openCreate}
        resultLabel={data ? resultLabel(data.total, list.query) : ''}
      />

      {members.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {members.isError && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {getErrorMessage(members.error)}
          <Button variant="outline" size="sm" onClick={() => void members.refetch()}>
            Réessayer
          </Button>
        </div>
      )}

      {data && data.total === 0 && !searching && <MembersEmptyState onAdd={openCreate} />}
      {data && data.total === 0 && searching && (
        <p className="text-sm text-muted-foreground">
          Aucun fidèle ne correspond à « {list.query.trim()} ».
        </p>
      )}
      {data && data.items.length > 0 && (
        <>
          <MembersTable
            members={data.items}
            onEdit={(member) => setDialog({ kind: 'edit', member })}
            onDelete={(member) => setDialog({ kind: 'delete', member })}
          />
          <MembersPagination
            page={list.page}
            pageCount={pageCount(data.total, MEMBERS_PAGE_SIZE)}
            onPageChange={list.setPage}
          />
        </>
      )}
    </div>
  )
}
