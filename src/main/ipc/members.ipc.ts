import type { MembersService } from '@main/services/members.service'
import type { Handle } from './handle'

export function registerMembersIpc(handle: Handle, members: MembersService): void {
  handle('members.list', (input) => members.list(input))
  handle('members.create', (input) => members.create(input))
  handle('members.update', (input) => members.update(input))
  handle('members.delete', ({ id }) => {
    members.delete(id)
    return null
  })
  handle('members.move', (input) => members.move(input))
  handle('members.swapChildRank', (input) => {
    members.swapChildRank(input)
    return null
  })
  handle('members.sponsoredHouseholds', ({ id }) => members.sponsoredHouseholds(id))
}
