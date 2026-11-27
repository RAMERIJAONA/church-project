import { useState } from 'react'
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import { ConfirmDeleteMemberDialog } from '../components/ConfirmDeleteMemberDialog'
import { ConfirmSwapDialog } from '../components/ConfirmSwapDialog'
import { MemberFormDialog } from '../components/MemberFormDialog'
import { MoveMemberDialog } from '../components/MoveMemberDialog'
import { useHouseholds, useSponsoredHouseholds } from '../queries'
import type { MemberEditor } from './use-member-editor'

export interface MemberDialogsProps {
  editor: MemberEditor
  /** Foyer du fidèle concerné (fiche, ajout) ; `undefined` tant qu'il se charge */
  household: HouseholdDTO | undefined
  today: string
}

/** Boîtes de dialogue d'un fidèle, branchées sur l'éditeur (page d'un foyer, liste globale). */
export function MemberDialogs({ editor, household, today }: MemberDialogsProps): React.JSX.Element {
  const { dialog } = editor
  const member = dialog && dialog.kind !== 'add' ? dialog.member : null
  const sponsored = useSponsoredHouseholds(
    member?.deacon && (dialog?.kind === 'edit' || dialog?.kind === 'delete') ? member.id : null
  )
  const [targetNumber, setTargetNumber] = useState<number | null>(null)
  const targets = useHouseholds(
    { search: targetNumber === null ? '' : String(targetNumber) },
    dialog?.kind === 'move' && targetNumber !== null
  )
  const target =
    targetNumber === null || targets.isFetching
      ? undefined
      : (targets.data?.items.find((h) => h.number === targetNumber) ?? null)
  const formOpen = (dialog?.kind === 'add' || dialog?.kind === 'edit') && household !== undefined

  return (
    <>
      {household && (
        <MemberFormDialog
          key={editor.formKey}
          open={formOpen}
          initial={dialog?.kind === 'edit' ? dialog.member : null}
          household={household}
          today={today}
          sponsoredHouseholds={sponsored.data ?? []}
          submitting={editor.submitting}
          serverError={editor.serverError}
          onSubmit={(values) => editor.save(values, false)}
          onSubmitAndNext={(values) => editor.save(values, true)}
          onCancel={editor.close}
        />
      )}
      <ConfirmDeleteMemberDialog
        member={dialog?.kind === 'delete' ? dialog.member : null}
        sponsoredHouseholds={sponsored.data ?? []}
        onConfirm={editor.confirmDelete}
        onCancel={editor.close}
      />
      <MoveMemberDialog
        member={dialog?.kind === 'move' ? dialog.member : null}
        target={target}
        onNumberChange={setTargetNumber}
        submitting={editor.submitting}
        serverError={editor.serverError?.message ?? null}
        onSubmit={editor.move}
        onCancel={() => {
          setTargetNumber(null)
          editor.close()
        }}
      />
      <ConfirmSwapDialog
        pair={dialog?.kind === 'swap' ? dialog : null}
        onConfirm={editor.confirmSwap}
        onCancel={editor.close}
      />
    </>
  )
}
