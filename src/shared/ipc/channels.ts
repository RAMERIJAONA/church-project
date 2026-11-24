/**
 * Liste des canaux IPC. Fichier SANS dépendance (pas de zod) : importé par le preload sandboxé
 * pour filtrer les canaux autorisés. contract.ts vérifie à la compilation qu'il couvre tout.
 */
export const CHANNELS = [
  'accounting.sheet',
  'accounting.createSection',
  'accounting.updateSection',
  'accounting.deleteSection',
  'accounting.moveSection',
  'accounting.createLine',
  'accounting.updateLine',
  'accounting.deleteLine',
  'accounting.moveLine',
  'accounting.setAmount',
  'app.info',
  'app.openLogsFolder',
  'backup.list',
  'backup.create',
  'backup.export',
  'backup.restore',
  'backup.openFolder',
  'settings.get',
  'settings.update'
] as const

export type Channel = (typeof CHANNELS)[number]

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value)
}
