/** Source unique du contrat IPC : schémas zod d'entrée + types de sortie par canal. */
import { z } from 'zod'
import { appSettingsPatchSchema, type AppSettings } from '../domain/settings/settings.types'
import type { Channel } from './channels'

export type { Channel } from './channels'

export const ipcInputs = {
  'app.info': z.undefined(),
  'settings.get': z.undefined(),
  'settings.update': appSettingsPatchSchema
} satisfies Record<Channel, z.ZodType>

export interface AppInfoDTO {
  name: string
  version: string
  isDebug: boolean
}

export interface IpcOutputs {
  'app.info': AppInfoDTO
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
