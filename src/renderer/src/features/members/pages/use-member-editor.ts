import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { MemberDTO } from '@shared/domain/members/members.types'
import type { MemberFormSubmit } from '../forms/member-form.schema'
import { serverErrorOf, type MemberServerError } from '../members.utils'
import { useCreateMember, useDeleteMember, useSwapChildRank, useUpdateMember } from '../queries'

/** Boîte ouverte sur un fidèle : ajout, fiche, suppression, échange de rangs. */
export type MemberDialog =
  | { kind: 'add'; householdId: number }
  | { kind: 'edit'; member: MemberDTO }
  | { kind: 'delete'; member: MemberDTO }
  | { kind: 'swap'; member: MemberDTO; neighbour: MemberDTO; direction: 'up' | 'down' }

export interface MemberEditor {
  dialog: MemberDialog | null
  submitting: boolean
  serverError: MemberServerError | null
  /** Change à chaque « Enregistrer et ajouter un autre » : la fiche repart vide */
  formKey: number
  open: (dialog: MemberDialog) => void
  close: () => void
  save: (values: MemberFormSubmit, next: boolean) => void
  confirmDelete: () => void
  confirmSwap: () => void
}

/** Écritures sur un fidèle : mutations, erreurs sous les champs, toasts. */
export function useMemberEditor(): MemberEditor {
  const create = useCreateMember()
  const update = useUpdateMember()
  const remove = useDeleteMember()
  const swap = useSwapChildRank()
  const [dialog, setDialog] = useState<MemberDialog | null>(null)
  const [serverError, setServerError] = useState<MemberServerError | null>(null)
  const [formKey, setFormKey] = useState(0)

  const open = (next: MemberDialog | null): void => {
    setServerError(null)
    setDialog(next)
  }
  const onError = (err: unknown): void => setServerError(serverErrorOf(err))
  const failed = (err: unknown): void => {
    toast.error(getErrorMessage(err))
  }

  return {
    dialog,
    submitting: create.isPending || update.isPending,
    serverError,
    formKey,
    open,
    close: () => open(null),
    save: (values, next) => {
      setServerError(null)
      if (dialog?.kind === 'edit') {
        update.mutate(
          { ...values, id: dialog.member.id },
          {
            onSuccess: () => {
              toast.success('Modifications enregistrées')
              open(null)
            },
            onError
          }
        )
      } else if (dialog?.kind === 'add') {
        create.mutate(
          { ...values, householdId: dialog.householdId },
          {
            onSuccess: (member) => {
              toast.success(`Membre ajouté : ${member.matricule}`)
              if (next) setFormKey((k) => k + 1)
              else open(null)
            },
            onError
          }
        )
      }
    },
    confirmDelete: () => {
      if (dialog?.kind !== 'delete') return
      const { member } = dialog
      open(null)
      remove.mutate(member.id, {
        onSuccess: () => toast.success('Fidèle supprimé'),
        onError: failed
      })
    },
    confirmSwap: () => {
      if (dialog?.kind !== 'swap') return
      const { member, direction } = dialog
      open(null)
      swap.mutate(
        { id: member.id, direction },
        { onSuccess: () => toast.success('Places échangées'), onError: failed }
      )
    }
  }
}
