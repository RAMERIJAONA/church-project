import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { isBlankQuery } from '@shared/domain/members/members.search'
import { MEMBERS_PAGE_SIZE } from '@shared/domain/members/members.types'
import { localDateOf } from '@shared/utils/dates'
import { MembersEmptyState } from '../components/MembersEmptyState'
import { MembersFilters } from '../components/MembersFilters'
import { MembersPagination } from '../components/MembersPagination'
import { MembersTable } from '../components/MembersTable'
import { MembersToolbar } from '../components/MembersToolbar'
import { pageCount, resultLabel } from '../members.utils'
import { useHousehold, useMembers, useSectors } from '../queries'
import { useMembersListState } from '../use-members-list-state'
import { MemberDialogs } from './MemberDialogs'
import { useMemberEditor } from './use-member-editor'

/** Liste des fidèles, tous foyers confondus : recherche, filtres, tri, fiche, accès au foyer. */
export function MembersPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [total, setTotal] = useState<number | undefined>(undefined)
  const list = useMembersListState(total)
  const members = useMembers({ ...list.list, search: list.query, page: list.page })
  const sectors = useSectors()
  const editor = useMemberEditor()
  const { dialog } = editor
  // Fiche ouverte depuis la liste : même fiche que dans le foyer (rôles, parrain, matricule)
  const household = useHousehold(dialog && dialog.kind !== 'add' ? dialog.member.householdId : null)
  const today = localDateOf(new Date())

  const data = members.data
  // Total de la dernière réponse, pour ramener la page sur la dernière existante (mise à jour
  // pendant le rendu : motif React « valeur dérivée du rendu précédent », sans effet)
  if (data && data.total !== total) setTotal(data.total)
  const narrowed = !isBlankQuery(list.query) || list.hasFilters

  return (
    // Hauteur de la zone visible : seul le tableau défile, recherche et pagination restent fixes
    <div className="flex h-full flex-col gap-3">
      <MembersToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        resultLabel={data ? resultLabel(data.total, list.query) : ''}
      />
      <MembersFilters
        sectors={sectors.data ?? []}
        filters={list.list}
        hasFilters={list.hasFilters}
        onChange={list.setFilters}
        onClear={list.clearFilters}
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

      {data && data.total === 0 && !narrowed && <MembersEmptyState />}
      {data && data.total === 0 && narrowed && (
        <p className="text-sm text-muted-foreground">Aucun fidèle ne correspond.</p>
      )}
      {data && data.items.length > 0 && (
        <>
          <MembersTable
            members={data.items}
            today={today}
            sort={list.list.sort}
            order={list.list.order}
            onSort={list.toggleSort}
            onEdit={(member) => editor.open({ kind: 'edit', member })}
            onOpenHousehold={(member) => navigate(`/foyers/${member.householdId}`)}
            onDelete={(member) => editor.open({ kind: 'delete', member })}
          />
          <MembersPagination
            page={list.page}
            pageCount={pageCount(data.total, MEMBERS_PAGE_SIZE)}
            onPageChange={list.setPage}
          />
        </>
      )}

      <MemberDialogs editor={editor} household={household.data} today={today} />
    </div>
  )
}
