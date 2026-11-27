import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { HouseholdDTO } from '@shared/domain/members/households.types'
import { useDeleteHousehold, useUpdateHousehold } from '../queries'

export interface HouseholdDialogs {
  editing: boolean
  deleting: boolean
  serverError: string | null
  submitting: boolean
  openEdit: () => void
  openDelete: () => void
  close: () => void
  save: (values: { sectorId: number; sponsorId: number | null }) => void
  confirmDelete: () => void
}

/** Modifier ou supprimer le foyer ouvert. */
export function useHouseholdDialogs(household: HouseholdDTO | undefined): HouseholdDialogs {
  const navigate = useNavigate()
  const update = useUpdateHousehold()
  const remove = useDeleteHousehold()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  return {
    editing,
    deleting,
    serverError,
    submitting: update.isPending,
    openEdit: () => {
      setServerError(null)
      setEditing(true)
    },
    openDelete: () => setDeleting(true),
    close: () => {
      setEditing(false)
      setDeleting(false)
    },
    save: (values: { sectorId: number; sponsorId: number | null }) => {
      if (!household) return
      update.mutate(
        { id: household.id, ...values },
        {
          onSuccess: () => {
            toast.success('Foyer modifié')
            setEditing(false)
          },
          onError: (err) => setServerError(getErrorMessage(err))
        }
      )
    },
    confirmDelete: () => {
      if (!household) return
      setDeleting(false)
      remove.mutate(household.id, {
        onSuccess: () => {
          toast.success(`Foyer ${household.number} supprimé`)
          navigate('/foyers')
        },
        onError: (err) => toast.error(getErrorMessage(err))
      })
    }
  }
}
