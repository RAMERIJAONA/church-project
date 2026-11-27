import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { MemberDTO } from '@shared/domain/members/members.types'
import type { MemberFormValues } from '../forms/member-form.schema'
import { serverErrorOf, type MemberServerError } from '../members.utils'
import { useDeleteMember, useUpdateMember } from '../queries'

/** Boîte ouverte : modification ou confirmation de suppression. */
export type MemberDialog =
  { kind: 'edit'; member: MemberDTO } | { kind: 'delete'; member: MemberDTO }

export interface MemberEditor {
  dialog: MemberDialog | null
  submitting: boolean
  serverError: MemberServerError | null
  openEdit: (member: MemberDTO) => void
  openDelete: (member: MemberDTO) => void
  close: () => void
  save: (values: MemberFormValues) => void
  confirmDelete: (member: MemberDTO) => void
}

/** Modification, suppression : mutations, erreurs sous les champs, toasts. */
export function useMemberEditor(): MemberEditor {
  const update = useUpdateMember()
  const remove = useDeleteMember()
  const [dialog, setDialog] = useState<MemberDialog | null>(null)
  const [serverError, setServerError] = useState<MemberServerError | null>(null)

  const open = (next: MemberDialog | null): void => {
    setServerError(null)
    setDialog(next)
  }

  const save = (values: MemberFormValues): void => {
    if (dialog?.kind !== 'edit') return
    const { member } = dialog
    setServerError(null)
    update.mutate(
      { ...values, id: member.id, role: member.role, sex: member.sex, deacon: member.deacon },
      {
        onSuccess: () => {
          toast.success('Modifications enregistrées')
          open(null)
        },
        onError: (err: unknown) => setServerError(serverErrorOf(err))
      }
    )
  }

  return {
    dialog,
    submitting: update.isPending,
    serverError,
    openEdit: (member) => open({ kind: 'edit', member }),
    openDelete: (member) => open({ kind: 'delete', member }),
    close: () => open(null),
    save,
    confirmDelete: (member) => {
      open(null)
      remove.mutate(member.id, {
        onSuccess: () => toast.success('Fidèle supprimé'),
        onError: (err) => toast.error(getErrorMessage(err))
      })
    }
  }
}
