import { describe, expect, it } from 'vitest'
import { formatBytes } from './format'

describe('formatBytes', () => {
  it.each([
    [512, '512 octets'],
    [12 * 1024, '12 Ko'],
    [1.4 * 1024 * 1024, '1,4 Mo'],
    [3 * 1024 ** 3, '3 Go']
  ])('%d → %s', (bytes, expected) => {
    // Intl fr-FR sépare par des espaces insécables : on les normalise
    expect(formatBytes(bytes).replace(/\s/g, ' ')).toBe(expected)
  })
})
