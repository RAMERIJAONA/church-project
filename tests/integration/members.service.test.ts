import { describe, expect, it } from 'vitest'
import { createFixedClock } from '@main/adapters/clock.adapter'
import { createLogger, createMemorySink } from '@main/logging/logger'
import { createMembersRepository } from '@main/repositories/members.repository'
import { createMembersService } from '@main/services/members.service'
import { AppError } from '@shared/domain/errors'
import {
  createMemberInputSchema,
  listMembersInputSchema,
  updateMemberInputSchema,
  type CreateMemberInput,
  type ListMembersInput,
  type MemberDTO
} from '@shared/domain/members/members.types'
import { makeMemberInput } from '@tests/factories/members.factory'
import { createTestDb } from '@tests/helpers/test-db'

function setup() {
  const handle = createTestDb()
  const clock = createFixedClock(new Date('2026-11-27T09:00:00.000Z'))
  const service = createMembersService({
    db: handle.db,
    members: createMembersRepository(),
    clock,
    logger: createLogger(createMemorySink())
  })
  // Entrées passées par le schéma zod, comme le fait le handler IPC
  const create = (input: Partial<CreateMemberInput> = {}): MemberDTO =>
    service.create(createMemberInputSchema.parse(makeMemberInput(input)))
  const update = (member: MemberDTO, changes: Partial<CreateMemberInput> = {}): MemberDTO =>
    service.update(updateMemberInputSchema.parse({ ...toInput(member), ...changes, id: member.id }))
  const list = (input: ListMembersInput = {}) => service.list(listMembersInputSchema.parse(input))
  return { handle, clock, service, create, update, list }
}

function toInput(m: MemberDTO): CreateMemberInput {
  return {
    lastName: m.lastName,
    firstName: m.firstName,
    birthDate: m.birthDate,
    address: m.address,
    phone: m.phone,
    sector: m.sector,
    baptized: m.baptized,
    communicant: m.communicant,
    registrationNumber: m.registrationNumber
  }
}

function caught(fn: () => unknown): AppError {
  try {
    fn()
  } catch (err) {
    if (err instanceof AppError) return err
    throw err
  }
  throw new Error('aucune erreur levée')
}

describe('MembersService : enregistrement', () => {
  it('enregistre nom et prénom normalisés et le téléphone canonique', () => {
    const { create } = setup()
    const m = create({ lastName: 'rakoto', firstName: 'rAkoto TiaNa', phone: '034 12 345 67' })
    expect(m).toMatchObject({
      lastName: 'RAKOTO',
      firstName: 'Rakoto Tiana',
      phone: '+261341234567',
      createdAt: '2026-11-27T09:00:00.000Z'
    })
  })

  it('refuse une date de naissance future', () => {
    const { create } = setup()
    const err = caught(() => create({ birthDate: '2026-11-28' }))
    expect(err.code).toBe('VALIDATION')
    expect(err.details).toEqual({ field: 'birthDate' })
  })

  it('refuse un téléphone qui n’est pas malgache', () => {
    const { create } = setup()
    const err = caught(() => create({ phone: '044 12 345 67' }))
    expect(err.code).toBe('VALIDATION')
    expect(err.details).toEqual({ field: 'phone' })
  })

  it('refuse un communiant non baptisé', () => {
    const { create } = setup()
    expect(caught(() => create({ baptized: false, communicant: true })).code).toBe('BUSINESS_RULE')
  })

  it('refuse un matricule déjà attribué, casse comprise', () => {
    const { create } = setup()
    create({ registrationNumber: 'M-0042' })
    const err = caught(() =>
      create({ firstName: 'Andry', registrationNumber: 'm-0042', confirmDuplicate: true })
    )
    expect(err.code).toBe('CONFLICT')
    expect(err.message).toBe('Le matricule m-0042 est déjà attribué à RAKOTO Tiana.')
    expect(err.details).toMatchObject({ reason: 'registration-number-taken' })
  })

  it("libère le matricule d'un fidèle supprimé", () => {
    const { create, service } = setup()
    const first = create({ registrationNumber: 'M-0042' })
    service.delete(first.id)
    expect(create({ firstName: 'Andry', registrationNumber: 'M-0042' }).registrationNumber).toBe(
      'M-0042'
    )
  })

  it("signale un doublon probable puis l'accepte avec confirmation", () => {
    const { create, list } = setup()
    const first = create()
    const err = caught(() => create({ lastName: 'rakoto', firstName: 'tiana' }))
    expect(err.code).toBe('CONFLICT')
    expect(err.message).toBe('Un fidèle RAKOTO Tiana né le 12/03/1985 existe déjà.')
    expect(err.details).toEqual({ reason: 'possible-duplicate', existing: first })
    expect(list().total).toBe(1)

    create({ confirmDuplicate: true })
    expect(list().total).toBe(2)
  })

  it('modifier un fidèle sans changer son matricule ni son identité ne crée pas de conflit', () => {
    const { create, update } = setup()
    const m = create({ registrationNumber: 'M-0042' })
    expect(update(m, { address: 'Ambohitsara' }).address).toBe('Ambohitsara')
  })

  it('avertit aussi quand une modification crée un doublon', () => {
    const { create, update } = setup()
    create()
    const other = create({ firstName: 'Andry' })
    const err = caught(() => update(other, { firstName: 'Tiana' }))
    expect(err.details).toMatchObject({ reason: 'possible-duplicate' })
  })

  it('horodate la modification avec l’horloge injectée', () => {
    const { create, update, clock } = setup()
    const m = create()
    clock.set(new Date('2026-11-28T10:00:00.000Z'))
    expect(update(m, { sector: 'Nord' })).toMatchObject({
      createdAt: '2026-11-27T09:00:00.000Z',
      updatedAt: '2026-11-28T10:00:00.000Z',
      sector: 'Nord'
    })
  })

  it('fidèle introuvable', () => {
    const { create, update, service } = setup()
    const m = create()
    service.delete(m.id)
    expect(caught(() => update(m)).code).toBe('NOT_FOUND')
    expect(caught(() => service.delete(m.id)).code).toBe('NOT_FOUND')
  })
})

describe('MembersService : liste et recherche', () => {
  it('pagine la liste triée par nom', () => {
    const { create, list } = setup()
    for (let i = 0; i < 120; i++) {
      create({ lastName: `NOM${String(119 - i).padStart(3, '0')}`, firstName: 'Tiana' })
    }
    const page3 = list({ page: 3 })
    expect(page3.total).toBe(120)
    expect(page3.items).toHaveLength(20)
    expect(page3.items[0]?.lastName).toBe('NOM100')
    expect(list().items[0]?.lastName).toBe('NOM000')
  })

  it('retrouve un fidèle malgré une faute de frappe', () => {
    const { create, list } = setup()
    create()
    create({ lastName: 'RASOA', firstName: 'Nirina' })
    const res = list({ search: 'rakto' })
    expect(res.total).toBe(1)
    expect(res.items.map((m) => m.lastName)).toEqual(['RAKOTO'])
  })

  it('traite une recherche faite de ponctuation comme vide', () => {
    const { create, list } = setup()
    create()
    expect(list({ search: ' - ' }).total).toBe(1)
  })

  it('met la recherche à jour après modification et suppression', () => {
    const { create, update, service, list } = setup()
    const m = create()
    expect(list({ search: 'rakoto' }).total).toBe(1)
    update(m, { lastName: 'RASOA' })
    expect(list({ search: 'rakoto' }).total).toBe(0)
    expect(list({ search: 'rasoa' }).total).toBe(1)
    service.delete(m.id)
    expect(list({ search: 'rasoa' }).total).toBe(0)
  })

  it('pagine les résultats de recherche dans l’ordre de pertinence', () => {
    const { create, list } = setup()
    create({ lastName: 'RAKOTOMALALA', firstName: 'Jean' })
    create({ lastName: 'RAKOTO', firstName: 'Tiana' })
    const res = list({ search: 'rakoto', pageSize: 1 })
    expect(res.total).toBe(2)
    expect(res.items.map((m) => m.lastName)).toEqual(['RAKOTO'])
    expect(list({ search: 'rakoto', pageSize: 1, page: 2 }).items[0]?.lastName).toBe('RAKOTOMALALA')
  })
})
