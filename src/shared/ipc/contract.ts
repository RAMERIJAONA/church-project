/** Source unique du contrat IPC : schémas zod d'entrée + types de sortie par canal. */
import { z } from 'zod'
import {
  addEntryInputSchema,
  createItemInputSchema,
  enteredTotalsInputSchema,
  idInputSchema,
  listEntriesInputSchema,
  listSheetInputSchema,
  moveInputSchema,
  periodTotalsInputSchema,
  setTotalInputSchema,
  updateEntryInputSchema,
  updateItemInputSchema,
  type AccountingSheetDTO,
  type CreatedEntryDTO,
  type CreatedItemDTO,
  type EnteredTotalsDTO,
  type EntryDTO,
  type MoveResultDTO,
  type PeriodTotalDTO
} from '../domain/accounting/accounting.types'
import { exportSheetInputSchema } from '../domain/accounting/accounting.export'
import {
  createHouseholdInputSchema,
  householdIdInputSchema,
  listHouseholdsInputSchema,
  sponsorCandidatesInputSchema,
  updateHouseholdInputSchema,
  type HouseholdDTO,
  type HouseholdSummaryDTO,
  type SponsorDTO
} from '../domain/members/households.types'
import {
  createMemberInputSchema,
  listMembersInputSchema,
  memberIdInputSchema,
  swapChildRankInputSchema,
  updateMemberInputSchema,
  type MemberDTO,
  type Paginated
} from '../domain/members/members.types'
import {
  createSectorInputSchema,
  renameSectorInputSchema,
  type SectorDTO
} from '../domain/members/sectors.types'
import { appSettingsPatchSchema, type AppSettings } from '../domain/settings/settings.types'
import type { Channel } from './channels'

export type { Channel } from './channels'

export const ipcInputs = {
  'accounting.sheet': listSheetInputSchema,
  'accounting.createItem': createItemInputSchema,
  'accounting.updateItem': updateItemInputSchema,
  'accounting.deleteItem': idInputSchema,
  'accounting.moveItem': moveInputSchema,
  'accounting.setTotal': setTotalInputSchema,
  'accounting.entries': listEntriesInputSchema,
  'accounting.addEntry': addEntryInputSchema,
  'accounting.updateEntry': updateEntryInputSchema,
  'accounting.deleteEntry': idInputSchema,
  'accounting.periodTotals': periodTotalsInputSchema,
  'accounting.enteredTotals': enteredTotalsInputSchema,
  'accounting.exportExcel': exportSheetInputSchema,
  'app.info': z.undefined(),
  'app.openLogsFolder': z.undefined(),
  'app.print': z.undefined(),
  'backup.list': z.undefined(),
  'backup.create': z.undefined(),
  'backup.export': z.undefined(),
  'backup.restore': z.undefined(),
  'backup.openFolder': z.undefined(),
  'households.list': listHouseholdsInputSchema,
  'households.get': householdIdInputSchema,
  'households.create': createHouseholdInputSchema,
  'households.update': updateHouseholdInputSchema,
  'households.delete': householdIdInputSchema,
  'households.sponsorCandidates': sponsorCandidatesInputSchema,
  'members.list': listMembersInputSchema,
  'members.create': createMemberInputSchema,
  'members.update': updateMemberInputSchema,
  'members.delete': memberIdInputSchema,
  'members.swapChildRank': swapChildRankInputSchema,
  'members.sponsoredHouseholds': memberIdInputSchema,
  'sectors.list': z.undefined(),
  'sectors.create': createSectorInputSchema,
  'sectors.rename': renameSectorInputSchema,
  'settings.get': z.undefined(),
  'settings.update': appSettingsPatchSchema
} satisfies Record<Channel, z.ZodType>

export interface AppInfoDTO {
  name: string
  version: string
  isDebug: boolean
}

export interface BackupDTO {
  fileName: string
  /** octets */
  size: number
  /** ISO 8601 UTC */
  createdAt: string
}

/**
 * `cancelled` : boîte de dialogue fermée. `saved` : aucune imprimante installée, la page a été
 * enregistrée en PDF à `path`.
 */
export type PrintResultDTO =
  { status: 'printed' } | { status: 'cancelled' } | { status: 'saved'; path: string }

export type ExportResultDTO = { status: 'saved'; path: string } | { status: 'cancelled' }
export type RestoreResultDTO = { status: 'restarting' } | { status: 'cancelled' }

export interface IpcOutputs {
  'accounting.sheet': AccountingSheetDTO
  'accounting.createItem': CreatedItemDTO
  'accounting.updateItem': null
  'accounting.deleteItem': null
  'accounting.moveItem': MoveResultDTO
  'accounting.setTotal': null
  'accounting.entries': EntryDTO[]
  'accounting.addEntry': CreatedEntryDTO
  'accounting.updateEntry': null
  'accounting.deleteEntry': null
  'accounting.periodTotals': PeriodTotalDTO[]
  'accounting.enteredTotals': EnteredTotalsDTO
  'accounting.exportExcel': ExportResultDTO
  'app.info': AppInfoDTO
  'app.openLogsFolder': null
  'app.print': PrintResultDTO
  'backup.list': BackupDTO[]
  'backup.create': BackupDTO
  'backup.export': ExportResultDTO
  'backup.restore': RestoreResultDTO
  'backup.openFolder': null
  'households.list': Paginated<HouseholdSummaryDTO>
  'households.get': HouseholdDTO
  'households.create': HouseholdDTO
  'households.update': HouseholdDTO
  'households.delete': null
  'households.sponsorCandidates': SponsorDTO[]
  'members.list': Paginated<MemberDTO>
  'members.create': MemberDTO
  'members.update': MemberDTO
  'members.delete': null
  'members.swapChildRank': null
  'members.sponsoredHouseholds': number[]
  'sectors.list': SectorDTO[]
  'sectors.create': SectorDTO
  'sectors.rename': SectorDTO
  'settings.get': AppSettings
  'settings.update': AppSettings
}

/** Entrée telle que l'envoie le renderer (avant defaults zod). */
export type IpcInput<C extends Channel> = z.input<(typeof ipcInputs)[C]>
/** Entrée validée telle que la reçoit le main. */
export type IpcParsed<C extends Channel> = z.output<(typeof ipcInputs)[C]>

// Garde-fou compile : IpcOutputs couvre exactement les canaux.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
export const _outputsCoverChannels: Exact<keyof IpcOutputs, Channel> = true
