/**
 * Liste des canaux IPC. Fichier SANS dépendance (pas de zod) : importé par le preload sandboxé
 * pour filtrer les canaux autorisés. contract.ts vérifie à la compilation qu'il couvre tout.
 */
export const CHANNELS = [
  'accounting.sheet',
  'accounting.createItem',
  'accounting.updateItem',
  'accounting.deleteItem',
  'accounting.moveItem',
  'accounting.setTotal',
  'accounting.entries',
  'accounting.addEntry',
  'accounting.updateEntry',
  'accounting.deleteEntry',
  'accounting.periodTotals',
  'accounting.exportExcel',
  'app.info',
  'app.openLogsFolder',
  'app.print',
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
