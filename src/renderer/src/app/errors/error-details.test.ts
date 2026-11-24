import { describe, expect, it } from 'vitest'
import { IpcError } from '@renderer/lib/ipc-client'
import { buildErrorDetails } from './error-details'
import { APP_NAME } from '@shared/domain/identity'

describe('buildErrorDetails', () => {
  it('contient version, écran, code et message', () => {
    const text = buildErrorDetails({
      error: new IpcError('BUSINESS_RULE', 'Stock insuffisant'),
      route: '#/parametres',
      version: '0.1.0',
      at: new Date('2026-11-24T10:00:00.000Z')
    })
    expect(text).toContain(`${APP_NAME} 0.1.0`)
    expect(text).toContain('Écran : #/parametres')
    expect(text).toContain('Code : BUSINESS_RULE')
    expect(text).toContain('Message : Stock insuffisant')
    expect(text).toContain('2026-11-24T10:00:00.000Z')
  })

  it('accepte une valeur qui n’est pas une Error', () => {
    const text = buildErrorDetails({
      error: 'boom',
      route: '#/',
      version: '0.1.0',
      at: new Date(0)
    })
    expect(text).toContain('Code : UNKNOWN')
    expect(text).toContain('Message : boom')
  })
})
