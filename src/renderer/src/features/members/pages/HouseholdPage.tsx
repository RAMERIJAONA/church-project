import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import { IpcError } from '@renderer/lib/ipc-client'
import { localDateOf } from '@shared/utils/dates'
import { HouseholdFormDialog } from '../components/HouseholdFormDialog'
import { HouseholdHeader } from '../components/HouseholdHeader'
import { HouseholdMembersTable } from '../components/HouseholdMembersTable'
import { useHousehold, useSectors, useSponsorCandidates } from '../queries'
import { SEARCH_DEBOUNCE_MS } from '../use-members-list-state'
import { useDebouncedValue } from '../use-debounced-value'
import { MemberDialogs } from './MemberDialogs'
import { useHouseholdDialogs } from './use-household-dialogs'
import { useMemberEditor } from './use-member-editor'

/** Un foyer et ses membres, par rang ; `?ajout=1` ouvre aussitôt la fiche d'un premier membre. */
export function HouseholdPage(): React.JSX.Element {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const id = Number(params['id'])
  const household = useHousehold(Number.isInteger(id) && id > 0 ? id : null)
  const editor = useMemberEditor()
  const dialogs = useHouseholdDialogs(household.data)
  const sectors = useSectors()
  const [sponsorSearch, setSponsorSearch] = useState('')
  const sponsors = useSponsorCandidates(
    useDebouncedValue(sponsorSearch, SEARCH_DEBOUNCE_MS),
    dialogs.editing
  )
  const today = localDateOf(new Date())
  const data = household.data
  const { open } = editor

  // Foyer tout juste créé : fiche du premier membre ouverte UNE fois, puis l'adresse est
  // nettoyée. Sans le garde, l'effet (relancé à chaque rendu tant que l'adresse n'a pas changé)
  // rouvrait la fiche en boucle, même après le dernier « Enregistrer » (E2E members.spec.ts).
  const adding = search.get('ajout') === '1'
  const openedFor = useRef<number | null>(null)
  useEffect(() => {
    if (!adding || !data || openedFor.current === data.id) return
    openedFor.current = data.id
    open({ kind: 'add', householdId: data.id })
    setSearch({}, { replace: true })
  }, [adding, data, open, setSearch])

  if (household.isPending) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (!data) {
    const missing = household.error instanceof IpcError && household.error.code === 'NOT_FOUND'
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p className={missing ? '' : 'text-destructive'}>
          {missing ? 'Ce foyer n’existe pas ou a été supprimé.' : getErrorMessage(household.error)}
        </p>
        <div className="flex gap-2">
          {!missing && (
            <Button variant="outline" size="sm" onClick={() => void household.refetch()}>
              Réessayer
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/foyers">Retour aux foyers</Link>
          </Button>
        </div>
      </div>
    )
  }

  const children = data.members.filter((m) => m.role === 'child')
  return (
    <div className="flex h-full flex-col gap-4">
      <HouseholdHeader
        household={data}
        onEdit={dialogs.openEdit}
        onAddMember={() => open({ kind: 'add', householdId: data.id })}
        onDelete={dialogs.openDelete}
      />
      {data.members.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Aucun membre. Ajoutez le père, la mère, les enfants, ou la personne seule qui forme ce
          foyer.
        </p>
      ) : (
        <HouseholdMembersTable
          members={data.members}
          sponsor={data.sponsor}
          today={today}
          onOpen={(member) => open({ kind: 'edit', member })}
          onDelete={(member) => open({ kind: 'delete', member })}
          onSwap={(member, direction) => {
            const neighbour = children[children.indexOf(member) + (direction === 'up' ? -1 : 1)]
            if (neighbour) open({ kind: 'swap', member, neighbour, direction })
          }}
        />
      )}

      <MemberDialogs editor={editor} household={data} today={today} />
      <HouseholdFormDialog
        open={dialogs.editing}
        initial={data}
        sectors={sectors.data ?? []}
        sponsorOptions={sponsors.data ?? []}
        onSponsorSearch={setSponsorSearch}
        submitting={dialogs.submitting}
        serverError={dialogs.serverError}
        onSubmit={dialogs.save}
        onCancel={dialogs.close}
      />
      <AlertDialog open={dialogs.deleting} onOpenChange={(o) => !o && dialogs.close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le foyer {data.number} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce foyer n’a aucun membre. Son numéro ne sera jamais réattribué.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={dialogs.confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
