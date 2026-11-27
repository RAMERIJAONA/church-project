import { describe, expect, it } from 'vitest'
import { rankForRole, roleError, ROLE_LABELS, sexForRole } from './households.rules'

describe('rang selon le rôle', () => {
  it('donne le rang 1 au père et au chef de foyer, 2 à la mère', () => {
    expect(rankForRole('father', 2)).toBe(1)
    expect(rankForRole('head', 7)).toBe(1)
    expect(rankForRole('mother', 7)).toBe(2)
  })

  it('donne à un enfant le rang qui suit le plus haut jamais attribué', () => {
    expect(rankForRole('child', 2)).toBe(3)
    expect(rankForRole('child', 5)).toBe(6)
  })

  it('nomme les rôles en français', () => {
    expect(ROLE_LABELS).toEqual({
      head: 'Chef de foyer',
      father: 'Père',
      mother: 'Mère',
      child: 'Enfant'
    })
  })
})

describe('contrôle du rôle', () => {
  it('refuse un père de sexe féminin et une mère de sexe masculin', () => {
    expect(roleError('father', 'F', new Set())).toBe('Le père est de sexe masculin.')
    expect(roleError('mother', 'M', new Set())).toBe('La mère est de sexe féminin.')
  })

  it('refuse un deuxième rang 1 ou une deuxième mère', () => {
    expect(roleError('head', 'F', new Set([1]))).toBe(
      'Ce foyer a déjà un rang 1 (Père ou Chef de foyer).'
    )
    expect(roleError('father', 'M', new Set([1]))).toBe(
      'Ce foyer a déjà un rang 1 (Père ou Chef de foyer).'
    )
    expect(roleError('mother', 'F', new Set([2]))).toBe('Ce foyer a déjà une mère.')
  })

  it('accepte un enfant de l’un ou l’autre sexe, et un chef de foyer de sexe féminin', () => {
    expect(roleError('child', 'F', new Set([1, 2]))).toBeNull()
    expect(roleError('child', 'M', new Set([1, 2, 3]))).toBeNull()
    expect(roleError('head', 'F', new Set([2]))).toBeNull()
  })
})

describe('sexe imposé par le rôle', () => {
  it('un père est masculin, une mère féminine, les autres rôles au choix', () => {
    expect(sexForRole('father')).toBe('M')
    expect(sexForRole('mother')).toBe('F')
    expect(sexForRole('head')).toBeNull()
    expect(sexForRole('child')).toBeNull()
  })
})
