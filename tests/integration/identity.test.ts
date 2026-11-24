import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_NAME, APP_SLUG } from '@shared/domain/identity'
import pkg from '../../package.json'

const builderYml = readFileSync(resolve(__dirname, '../../electron-builder.yml'), 'utf8')
const yamlValue = (key: string): string | undefined =>
  new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm').exec(builderYml)?.[1]?.trim()

// Le nom fixe les dossiers de données : une divergence = données « perdues » au lancement
describe('identité du logiciel', () => {
  it('APP_NAME = productName de package.json et de electron-builder.yml', () => {
    expect(pkg.productName).toBe(APP_NAME)
    expect(yamlValue('productName')).toBe(APP_NAME)
  })

  it('exe et installeur portent le nom de fichier du logiciel', () => {
    expect(yamlValue('executableName')).toBe(APP_SLUG)
    expect(yamlValue('artifactName')).toBe(`${APP_SLUG}-\${version}-setup.\${ext}`)
  })
})
