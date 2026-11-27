import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Pas de globals Vitest : le nettoyage automatique de Testing Library est donc explicite.
afterEach(() => cleanup())

// jsdom ne fournit pas ResizeObserver, utilisé par Radix (RadioGroup de SegmentedControl) :
// observateur sans effet, la mise en page n'existe pas dans jsdom.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {
      // sans effet
    }
    unobserve(): void {
      // sans effet
    }
    disconnect(): void {
      // sans effet
    }
  }
}
