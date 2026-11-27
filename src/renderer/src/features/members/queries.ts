import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateHouseholdInput,
  ListHouseholdsInput,
  UpdateHouseholdInput
} from '@shared/domain/members/households.types'
import type {
  CreateMemberInput,
  ListMembersInput,
  SwapChildRankInput,
  UpdateMemberInput
} from '@shared/domain/members/members.types'
import type { CreateSectorInput, RenameSectorInput } from '@shared/domain/members/sectors.types'
import { householdsApi, membersApi, sectorsApi } from './api'

/**
 * Query key factory : seule source des clés de cette feature. Fidèles, foyers et secteurs
 * partagent une racine : une écriture de l'un change ce qu'affichent les autres (matricule,
 * parrain, compteurs), tout est invalidé ensemble.
 */
export const membersKeys = {
  all: ['registry'] as const,
  list: (input: ListMembersInput) => [...membersKeys.all, 'members', input] as const,
  sponsored: (id: number) => [...membersKeys.all, 'sponsored', id] as const,
  households: (input: ListHouseholdsInput) => [...membersKeys.all, 'households', input] as const,
  household: (id: number) => [...membersKeys.all, 'household', id] as const,
  sponsorCandidates: (search: string) => [...membersKeys.all, 'sponsors', search] as const,
  sectors: () => [...membersKeys.all, 'sectors'] as const
}

/** Page de la liste (ou des résultats) ; la page précédente reste affichée pendant le chargement. */
export function useMembers(input: ListMembersInput) {
  return useQuery({
    queryKey: membersKeys.list(input),
    queryFn: () => membersApi.list(input),
    placeholderData: (previous) => previous
  })
}

/** Foyers que ce fidèle parraine (avertissement avant de retirer Diacre) ; `null` : aucun fidèle. */
export function useSponsoredHouseholds(id: number | null) {
  return useQuery({
    queryKey: membersKeys.sponsored(id ?? 0),
    queryFn: () => membersApi.sponsoredHouseholds(id ?? 0),
    enabled: id !== null
  })
}

export function useHouseholds(input: ListHouseholdsInput) {
  return useQuery({
    queryKey: membersKeys.households(input),
    queryFn: () => householdsApi.list(input),
    placeholderData: (previous) => previous
  })
}

/** Foyer ouvert ; `null` : aucun (fiche fermée). */
export function useHousehold(id: number | null) {
  return useQuery({
    queryKey: membersKeys.household(id ?? 0),
    queryFn: () => householdsApi.get(id ?? 0),
    enabled: id !== null
  })
}

export function useSponsorCandidates(search: string, enabled = true) {
  return useQuery({
    queryKey: membersKeys.sponsorCandidates(search),
    queryFn: () => householdsApi.sponsorCandidates(search),
    placeholderData: (previous) => previous,
    enabled
  })
}

export function useSectors() {
  return useQuery({ queryKey: membersKeys.sectors(), queryFn: () => sectorsApi.list() })
}

function useRegistryMutation<I, O>(fn: (input: I) => Promise<O>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: membersKeys.all })
  })
}

export function useCreateMember() {
  return useRegistryMutation((input: CreateMemberInput) => membersApi.create(input))
}

export function useUpdateMember() {
  return useRegistryMutation((input: UpdateMemberInput) => membersApi.update(input))
}

export function useDeleteMember() {
  return useRegistryMutation((id: number) => membersApi.remove(id))
}

export function useSwapChildRank() {
  return useRegistryMutation((input: SwapChildRankInput) => membersApi.swapChildRank(input))
}

export function useCreateHousehold() {
  return useRegistryMutation((input: CreateHouseholdInput) => householdsApi.create(input))
}

export function useUpdateHousehold() {
  return useRegistryMutation((input: UpdateHouseholdInput) => householdsApi.update(input))
}

export function useDeleteHousehold() {
  return useRegistryMutation((id: number) => householdsApi.remove(id))
}

export function useCreateSector() {
  return useRegistryMutation((input: CreateSectorInput) => sectorsApi.create(input))
}

export function useRenameSector() {
  return useRegistryMutation((input: RenameSectorInput) => sectorsApi.rename(input))
}
