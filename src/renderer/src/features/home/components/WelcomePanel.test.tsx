import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { WelcomePanel } from './WelcomePanel'

describe('WelcomePanel', () => {
  it('propose les fidèles puis les deux comptabilités, dans l’ordre du menu', () => {
    render(
      <MemoryRouter>
        <WelcomePanel version="0.1.0" />
      </MemoryRouter>
    )
    const links = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') !== '/parametres')
      .map((a) => [a.querySelector('.font-medium')?.textContent, a.getAttribute('href')])
    expect(links).toEqual([
      ['Fidèles', '/foyers'],
      ['Comptabilité des entrées', '/comptabilite/entrees'],
      ['Comptabilité des sorties', '/comptabilite/sorties']
    ])
  })
})
