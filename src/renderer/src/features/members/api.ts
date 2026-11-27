import { invoke } from '@renderer/lib/ipc-client'
import type {
  CreateMemberInput,
  ListMembersInput,
  UpdateMemberInput
} from '@shared/domain/members/members.types'

export const membersApi = {
  list: (input: ListMembersInput) => invoke('members.list', input),
  create: (input: CreateMemberInput) => invoke('members.create', input),
  update: (input: UpdateMemberInput) => invoke('members.update', input),
  remove: (id: number) => invoke('members.delete', { id })
}
