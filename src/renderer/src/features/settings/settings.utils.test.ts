import { describe, expect, it } from 'vitest'
import { backupReasonLabel } from './settings.utils'

describe('backupReasonLabel', () => {
  it.each([
    ['sauvegarde_2026-11-24_09-00-00_auto.db', 'Automatique'],
    ['sauvegarde_2026-11-24_09-00-00_avant-migration.db', 'Avant mise à jour'],
    ['sauvegarde_2026-11-24_09-00-00_avant-restauration.db', 'Avant restauration'],
    ['autre-fichier.db', 'Sauvegarde']
  ])('%s → %s', (file, label) => {
    expect(backupReasonLabel(file)).toBe(label)
  })
})
