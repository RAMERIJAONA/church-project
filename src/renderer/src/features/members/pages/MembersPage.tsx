import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { localDateOf } from '@shared/utils/dates'
import { isBlankQuery } from '@shared/domain/members/members.search'
import { MEMBERS_PAGE_SIZE } from '@shared/domain/members/members.types'
import { MembersEmptyState } from '../components/MembersEmptyState'
import { MembersPagination } from '../components/MembersPagination'
import { MembersTable } from '../components/MembersTable'
import { MembersToolbar } from '../components/MembersToolbar'
import { pageCount, resultLabel } from '../members.utils'
import { useHousehold, useMembers } from '../queries'
import { useMembersListState } from '../use-members-list-state'
import { MemberDialogs } from './MemberDialogs'
import { useMemberEditor } from './use-member-editor'

/** Fidèles : liste paginée, recherche en temps réel, modification / suppression. */
export function MembersPage(): React.JSX.Element {
  const [total, setTotal] = useState<number | undefined>(undefined)
  const list = useMembersListState(total)
  const members = useMembers({ search: list.query, page: list.page })
  const editor = useMemberEditor()
  const { dialog } = editor
  // Fiche ouverte depuis la liste : même fiche que dans le foyer (rôles, parrain, matricule)
  const household = useHousehold(dialog && dialog.kind !== 'add' ? dialog.member.householdId : null)

  const data = members.data
  // Total de la dernière réponse, pour ramener la page sur la dernière existante (mise à jour
  // pendant le rendu : motif React « valeur dérivée du rendu précédent », sans effet)
  if (data && data.total !== total) setTotal(data.total)
  const searching = !isBlankQuery(list.query)

  return (
    // Hauteur de la zone visible : seul le tableau défile, recherche et pagination restent fixes
    <div className="flex h-full flex-col gap-4">
      <MembersToolbar
        search={list.search}
        onSearchChange={list.setSearch}
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

      {data && data.total === 0 && !searching && <MembersEmptyState />}
      {data && data.total === 0 && searching && (
        <p className="text-sm text-muted-foreground">
          Aucun fidèle ne correspond à « {list.query.trim()} ».
        </p>
      )}
      {data && data.items.length > 0 && (
        <>
          <MembersTable
            members={data.items}
            onEdit={(member) => editor.open({ kind: 'edit', member })}
            onDelete={(member) => editor.open({ kind: 'delete', member })}
          />
          <MembersPagination
            page={list.page}
            pageCount={pageCount(data.total, MEMBERS_PAGE_SIZE)}
            onPageChange={list.setPage}
          />
        </>
      )}

      <MemberDialogs editor={editor} household={household.data} today={localDateOf(new Date())} />
    </div>
  )
}
