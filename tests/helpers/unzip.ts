/**
 * Lecture d'une archive zip (tests de l'export Excel) : répertoire central, décompression et
 * contrôle du CRC-32 de chaque fichier. Volontairement indépendant de l'écriture (main/export).
 */
import { crc32, inflateRawSync } from 'node:zlib'

export function unzip(archive: Buffer): Map<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (end < 0) throw new Error('fin de répertoire central introuvable')
  const count = archive.readUInt16LE(end + 10)
  let at = archive.readUInt32LE(end + 16)
  const files = new Map<string, string>()
  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(at) !== 0x02014b50) throw new Error(`entrée ${i} invalide`)
    const method = archive.readUInt16LE(at + 10)
    const crc = archive.readUInt32LE(at + 16)
    const size = archive.readUInt32LE(at + 24) // taille décompressée
    const nameLength = archive.readUInt16LE(at + 28)
    const extra = archive.readUInt16LE(at + 30)
    const comment = archive.readUInt16LE(at + 32)
    const offset = archive.readUInt32LE(at + 42)
    const name = archive.toString('utf8', at + 46, at + 46 + nameLength)

    if (archive.readUInt32LE(offset) !== 0x04034b50) throw new Error(`${name} : en-tête local`)
    const start =
      offset + 30 + archive.readUInt16LE(offset + 26) + archive.readUInt16LE(offset + 28)
    const raw = archive.subarray(start, start + archive.readUInt32LE(offset + 18))
    const data = method === 8 ? inflateRawSync(raw) : raw
    if (data.length !== size || crc32(data) !== crc) throw new Error(`${name} : CRC incorrect`)
    files.set(name, data.toString('utf8'))
    at += 46 + nameLength + extra + comment
  }
  return files
}
