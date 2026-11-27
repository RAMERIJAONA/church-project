import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { CreateMemberInput, MemberDTO } from '@shared/domain/members/members.types'
import type { MemberFormValues } from '../forms/member-form.schema'
import { conflictDetails, serverErrorOf, type MemberServerError } from '../members.utils'
import { useCreateMember, useDeleteMember, useUpdateMember } from '../queries'

/** Boîte ouverte : ajout, modification ou confirmation de suppression. */
export type MemberDialog =
  { kind: 'create' } | { kind: 'edit'; member: MemberDTO } | { kind: 'delete'; member: MemberDTO }

export interface MemberEditor {
  dialog: MemberDialog | null
  submitting: boolean
  serverError: MemberServerError | null
  /** Doublon probable en attente de confirmation */
  duplicate: MemberDTO | null
  openCreate: () => void
  openEdit: (member: MemberDTO) => void
  openDelete: (member: MemberDTO) => void
  close: () => void
  save: (values: MemberFormValues) => void
  confirmDuplicate: () => void
  cancelDuplicate: () => void
  confirmDelete: (member: MemberDTO) => void
}

const toInput = (values: MemberFormValues, confirmDuplicate: boolean): CreateMemberInput => ({
  ...values,
  confirmDuplicate
})

/** Ajout, modification, suppression : mutations, doublon probable, erreurs, toasts. */
export function useMemberEditor(): MemberEditor {
  const create = useCreateMember()
  const update = useUpdateMember()
  const remove = useDeleteMember()
  const [dialog, setDialog] = useState<MemberDialog | null>(null)
  const [serverError, setServerError] = useState<MemberServerError | null>(null)
  const [pending, setPending] = useState<{ values: MemberFormValues; existing: MemberDTO } | null>(
    null
  )

  const open = (next: MemberDialog | null): void => {
    setServerError(null)
    setPending(null)
    setDialog(next)
  }

  const submit = (values: MemberFormValues, confirmDuplicate: boolean): void => {
    if (dialog?.kind !== 'create' && dialog?.kind !== 'edit') return
    const editing = dialog.kind === 'edit' ? dialog.member : null
    const options = {
      onSuccess: () => {
        toast.success(editing ? 'Modifications enregistrées' : 'Fidèle ajouté')
        open(null)
      },
      onError: (err: unknown) => {
        const conflict = conflictDetails(err)
        if (conflict?.reason === 'possible-duplicate') {
          setPending({ values, existing: conflict.existing })
          return
        }
        setServerError(serverErrorOf(err))
      }
    }
    setServerError(null)
    const input = toInput(values, confirmDuplicate)
    if (editing) update.mutate({ ...input, id: editing.id }, options)
    else create.mutate(input, options)
  }

  return {
    dialog,
    submitting: create.isPending || update.isPending,
    serverError,
    duplicate: pending?.existing ?? null,
    openCreate: () => open({ kind: 'create' }),
    openEdit: (member) => open({ kind: 'edit', member }),
    openDelete: (member) => open({ kind: 'delete', member }),
    close: () => open(null),
    save: (values) => submit(values, false),
    confirmDuplicate: () => {
      if (!pending) return
      setPending(null)
      submit(pending.values, true)
    },
    cancelDuplicate: () => setPending(null),
    confirmDelete: (member) => {
      open(null)
      remove.mutate(member.id, {
        onSuccess: () => toast.success('Fidèle supprimé'),
        onError: (err) => toast.error(getErrorMessage(err))
      })
    }
  }
}
