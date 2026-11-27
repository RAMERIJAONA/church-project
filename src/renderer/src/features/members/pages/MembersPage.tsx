import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { localDateOf } from '@shared/utils/dates'
import { isBlankQuery } from '@shared/domain/members/members.search'
import { MEMBERS_PAGE_SIZE } from '@shared/domain/members/members.types'
import { ConfirmDeleteMemberDialog } from '../components/ConfirmDeleteMemberDialog'
import { MemberFormDialog } from '../components/MemberFormDialog'
import { MembersEmptyState } from '../components/MembersEmptyState'
import { MembersPagination } from '../components/MembersPagination'
import { MembersTable } from '../components/MembersTable'
import { MembersToolbar } from '../components/MembersToolbar'
import { pageCount, resultLabel } from '../members.utils'
import { useMembers } from '../queries'
import { useMembersListState } from '../use-members-list-state'
import { useMemberEditor } from './use-member-editor'

/** Fidèles : liste paginée, recherche en temps réel, ajout / modification / suppression. */
export function MembersPage(): React.JSX.Element {
  const [total, setTotal] = useState<number | undefined>(undefined)
  const list = useMembersListState(total)
  const members = useMembers(list.query, list.page)
  const editor = useMemberEditor()
  const { dialog } = editor

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
        onAdd={editor.openCreate}
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

      {data && data.total === 0 && !searching && <MembersEmptyState onAdd={editor.openCreate} />}
      {data && data.total === 0 && searching && (
        <p className="text-sm text-muted-foreground">
          Aucun fidèle ne correspond à « {list.query.trim()} ».
        </p>
      )}
      {data && data.items.length > 0 && (
        <>
          <MembersTable
            members={data.items}
            onEdit={editor.openEdit}
            onDelete={editor.openDelete}
          />
          <MembersPagination
            page={list.page}
            pageCount={pageCount(data.total, MEMBERS_PAGE_SIZE)}
            onPageChange={list.setPage}
          />
        </>
      )}

      <MemberFormDialog
        open={dialog?.kind === 'create' || dialog?.kind === 'edit'}
        initial={dialog?.kind === 'edit' ? dialog.member : null}
        today={localDateOf(new Date())}
        submitting={editor.submitting}
        serverError={editor.serverError}
        onSubmit={editor.save}
        onCancel={editor.close}
      />
      <ConfirmDeleteMemberDialog
        member={dialog?.kind === 'delete' ? dialog.member : null}
        onConfirm={editor.confirmDelete}
        onCancel={editor.close}
      />
    </div>
  )
}
