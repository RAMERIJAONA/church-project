import { invoke } from '@renderer/lib/ipc-client'
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

export const membersApi = {
  list: (input: ListMembersInput) => invoke('members.list', input),
  create: (input: CreateMemberInput) => invoke('members.create', input),
  update: (input: UpdateMemberInput) => invoke('members.update', input),
  remove: (id: number) => invoke('members.delete', { id }),
  swapChildRank: (input: SwapChildRankInput) => invoke('members.swapChildRank', input),
  sponsoredHouseholds: (id: number) => invoke('members.sponsoredHouseholds', { id })
}

export const householdsApi = {
  list: (input: ListHouseholdsInput) => invoke('households.list', input),
  get: (id: number) => invoke('households.get', { id }),
  create: (input: CreateHouseholdInput) => invoke('households.create', input),
  update: (input: UpdateHouseholdInput) => invoke('households.update', input),
  remove: (id: number) => invoke('households.delete', { id }),
  sponsorCandidates: (search: string) => invoke('households.sponsorCandidates', { search })
}

export const sectorsApi = {
  list: () => invoke('sectors.list', undefined),
  create: (input: CreateSectorInput) => invoke('sectors.create', input),
  rename: (input: RenameSectorInput) => invoke('sectors.rename', input)
}
