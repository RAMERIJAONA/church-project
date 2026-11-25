/**
 * Taille de la fenêtre principale (pixels d'écran), calculée sans Electron (testable).
 *
 * Minimum 1160 × 640 : en taille de texte normale, menu (210 px) + marges (56 px) + tableau de
 * comptabilité (60rem = 840 px, montants jamais tronqués) + barre de défilement (17 px) +
 * cadre de fenêtre Windows (16 px) tiennent sans défilement horizontal (demande du porteur,
 * 2026-11-25 : ne pas casser l'affichage en réduisant la fenêtre).
 * Sur un écran plus petit (ex. 1024 × 768), le minimum est ramené à la zone utile de l'écran :
 * une fenêtre minimale plus grande que l'écran en sortirait. Le tableau défile alors
 * horizontalement (de même avec le texte en « grand »).
 */
export const WINDOW_MIN = { width: 1160, height: 640 } as const
export const WINDOW_DEFAULT = { width: 1280, height: 800 } as const

export interface Size {
  width: number
  height: number
}

export function windowSize(workArea: Size): { min: Size; initial: Size } {
  const min = {
    width: Math.min(WINDOW_MIN.width, workArea.width),
    height: Math.min(WINDOW_MIN.height, workArea.height)
  }
  const initial = {
    width: Math.min(WINDOW_DEFAULT.width, workArea.width),
    height: Math.min(WINDOW_DEFAULT.height, workArea.height)
  }
  return { min, initial }
}
