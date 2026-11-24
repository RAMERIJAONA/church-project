import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Pas de globals Vitest : le nettoyage automatique de Testing Library est donc explicite.
afterEach(() => cleanup())
