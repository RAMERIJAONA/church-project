const UNITS = ['octets', 'Ko', 'Mo', 'Go'] as const

/** Taille lisible en français : « 12 Ko », « 1,4 Mo ». */
export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value)} ${UNITS[unit]}`
}
