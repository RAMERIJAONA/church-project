import type { HouseholdsService } from '@main/services/households.service'
import type { Handle } from './handle'

export function registerHouseholdsIpc(handle: Handle, households: HouseholdsService): void {
  handle('households.list', (input) => households.list(input))
  handle('households.get', ({ id }) => households.get(id))
  handle('households.create', (input) => households.create(input))
  handle('households.update', (input) => households.update(input))
  handle('households.delete', ({ id }) => {
    households.delete(id)
    return null
  })
  handle('households.sponsorCandidates', ({ search }) => households.sponsorCandidates(search))
}
