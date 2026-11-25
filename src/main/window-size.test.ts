import { describe, expect, it } from 'vitest'
import { WINDOW_DEFAULT, WINDOW_MIN, windowSize } from './window-size'

describe('taille de la fenêtre', () => {
  it('grand écran : minimum 1160 × 640, ouverture en 1280 × 800', () => {
    expect(windowSize({ width: 1920, height: 1040 })).toEqual({
      min: WINDOW_MIN,
      initial: WINDOW_DEFAULT
    })
  })

  it('écran 1366 × 768 (barre des tâches déduite) : la fenêtre ne dépasse pas l’écran', () => {
    expect(windowSize({ width: 1366, height: 728 })).toEqual({
      min: { width: 1160, height: 640 },
      initial: { width: 1280, height: 728 }
    })
  })

  it('petit écran 1024 × 768 : minimum ramené à la zone utile, jamais plus grand que l’écran', () => {
    expect(windowSize({ width: 1024, height: 728 })).toEqual({
      min: { width: 1024, height: 640 },
      initial: { width: 1024, height: 728 }
    })
  })
})
