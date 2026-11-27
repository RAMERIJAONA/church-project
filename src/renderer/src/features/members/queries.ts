import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateMemberInput, UpdateMemberInput } from '@shared/domain/members/members.types'
import { membersApi } from './api'

/** Query key factory : seule source des clés de cette feature. */
export const membersKeys = {
  all: ['members'] as const,
  list: (search: string, page: number) => [...membersKeys.all, 'list', search, page] as const
}

/** Page de la liste (ou des résultats) ; la page précédente reste affichée pendant le chargement. */
export function useMembers(search: string, page: number) {
  return useQuery({
    queryKey: membersKeys.list(search, page),
    queryFn: () => membersApi.list({ search, page }),
    placeholderData: (previous) => previous
  })
}

function useMembersMutation<I, O>(fn: (input: I) => Promise<O>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: membersKeys.all })
  })
}

export function useCreateMember() {
  return useMembersMutation((input: CreateMemberInput) => membersApi.create(input))
}

export function useUpdateMember() {
  return useMembersMutation((input: UpdateMemberInput) => membersApi.update(input))
}

export function useDeleteMember() {
  return useMembersMutation((id: number) => membersApi.remove(id))
}
