/** Source unique du contrat IPC : schémas zod d'entrée + types de sortie par canal. */
import { z } from 'zod'
import {
  addEntryInputSchema,
  createItemInputSchema,
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
  type EntryDTO,
  type MoveResultDTO,
  type PeriodTotalDTO
} from '../domain/accounting/accounting.types'
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
  'app.info': z.undefined(),
  'app.openLogsFolder': z.undefined(),
  'app.print': z.undefined(),
  'backup.list': z.undefined(),
  'backup.create': z.undefined(),
  'backup.export': z.undefined(),
  'backup.restore': z.undefined(),
  'backup.openFolder': z.undefined(),
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

/** `cancelled` : l'utilisateur a fermé la boîte de dialogue d'impression. */
export interface PrintResultDTO {
  status: 'printed' | 'cancelled'
}

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
  'app.info': AppInfoDTO
  'app.openLogsFolder': null
  'app.print': PrintResultDTO
  'backup.list': BackupDTO[]
  'backup.create': BackupDTO
  'backup.export': ExportResultDTO
  'backup.restore': RestoreResultDTO
  'backup.openFolder': null
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
