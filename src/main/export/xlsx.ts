/**
 * Écriture d'un classeur Excel (.xlsx) d'une feuille, sans dépendance : un .xlsx est une
 * archive zip de fichiers XML (Office Open XML). Seul ce dont l'export a besoin est géré :
 * texte, nombres entiers, quelques styles, largeurs de colonnes, lignes figées et répétées à
 * l'impression. Fonction pure (pas d'accès disque) : le service écrit le fichier.
 *
 * Choix (2026-11-25) : pas de bibliothèque (exceljs, SheetJS…) pour un seul tableau ; zip et
 * CRC-32 viennent de node:zlib.
 */
import { crc32, deflateRawSync } from 'node:zlib'

/** Styles disponibles (index dans `cellXfs` de styles.xml, même ordre). */
export const CELL_STYLES = [
  'text',
  'title',
  'bold',
  'header',
  'headerAmount',
  'amount',
  'amountBold',
  'indent1',
  'indent2',
  'indent3',
  'descriptionBold'
] as const
export type CellStyle = (typeof CELL_STYLES)[number]

export interface XlsxCell {
  /** `null` : case vide (non écrite) */
  value: string | number | null
  style?: CellStyle
}

export interface XlsxSheet {
  /** Nom de l'onglet (31 caractères au plus, sans `[]:*?/\`) */
  name: string
  /** Largeur de chaque colonne, en caractères */
  columnWidths: number[]
  rows: XlsxCell[][]
  /** Nombre de lignes du haut figées à l'écran et répétées à chaque page imprimée */
  headerRows?: number
}

/** Format des montants : « 2 000 000 Ar » (séparateur de milliers de la langue d'Excel). */
const AMOUNT_FORMAT = '#,##0" Ar"'

// Caractères interdits en XML 1.0 (contrôles sauf tabulation et retours à la ligne)
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 0 → A, 25 → Z, 26 → AA */
export function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

/** Nom d'onglet accepté par Excel. */
export function safeSheetName(name: string): string {
  const cleaned = name
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, 31)
  return cleaned === '' ? 'Feuille 1' : cleaned
}

function cellXml(cell: XlsxCell, ref: string): string {
  const s = CELL_STYLES.indexOf(cell.style ?? 'text')
  const style = s > 0 ? ` s="${s}"` : ''
  if (typeof cell.value === 'number') {
    if (!Number.isFinite(cell.value)) throw new Error(`Nombre invalide en ${ref}`)
    return `<c r="${ref}"${style}><v>${cell.value}</v></c>`
  }
  const text = escapeXml(cell.value ?? '')
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
}

function sheetXml(sheet: XlsxSheet): string {
  const rows = sheet.rows
    .map((cells, r) => {
      const content = cells
        .map((cell, c) => (cell.value === null ? '' : cellXml(cell, `${columnName(c)}${r + 1}`)))
        .join('')
      return `<row r="${r + 1}">${content}</row>`
    })
    .join('')
  const cols = sheet.columnWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join('')
  const frozen = sheet.headerRows ?? 0
  const pane =
    frozen > 0
      ? `<pane ySplit="${frozen}" topLeftCell="A${frozen + 1}" activePane="bottomLeft" state="frozen"/>`
      : ''
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${rows}</sheetData>` +
    '<pageMargins left="0.6" right="0.6" top="0.7" bottom="0.7" header="0.3" footer="0.3"/>' +
    // A4 portrait, toute la largeur sur une page, autant de pages que nécessaire en hauteur
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  )
}

function workbookXml(sheet: XlsxSheet): string {
  const name = escapeXml(safeSheetName(sheet.name))
  const frozen = sheet.headerRows ?? 0
  const quoted = `'${name.replace(/'/g, "''")}'`
  const printTitles =
    frozen > 0
      ? `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">${quoted}!$1:$${frozen}</definedName></definedNames>`
      : ''
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
    printTitles +
    '</workbook>'
  )
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="${escapeXml(AMOUNT_FORMAT)}"/></numFmts>` +
  '<fonts count="3">' +
  '<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
  '<font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font>' +
  '</fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  `<cellXfs count="${CELL_STYLES.length}">` +
  // même ordre que CELL_STYLES
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // text
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // title
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // bold
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' + // header
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>' + // headerAmount
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' + // amount
  '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' + // amountBold
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment indent="1" wrapText="1" vertical="top"/></xf>' + // indent1
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment indent="2" wrapText="1" vertical="top"/></xf>' + // indent2
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment indent="3" wrapText="1" vertical="top"/></xf>' + // indent3
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' + // descriptionBold
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>'

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const ROOT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const WORKBOOK_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

/** Date et heure au format MS-DOS des en-têtes zip (heure locale, précision 2 s). */
function dosDateTime(at: Date): { date: number; time: number } {
  const year = Math.min(Math.max(at.getFullYear(), 1980), 2107)
  return {
    date: ((year - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2)
  }
}

/** Archive zip (méthode « deflate »), noms en UTF-8. */
export function zip(files: ReadonlyArray<{ name: string; data: Buffer }>, at: Date): Buffer {
  const { date, time } = dosDateTime(at)
  const UTF8_NAMES = 0x0800
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const data = deflateRawSync(file.data)
    const crc = crc32(file.data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version nécessaire
    local.writeUInt16LE(UTF8_NAMES, 6)
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // pas de champ extra
    locals.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version de création
    central.writeUInt16LE(20, 6) // version nécessaire
    central.writeUInt16LE(UTF8_NAMES, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    // extra, commentaire, disque, attributs internes / externes : 0
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += local.length + name.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

/** Classeur d'une feuille, prêt à écrire dans un fichier .xlsx. */
export function buildXlsx(sheet: XlsxSheet, at: Date): Buffer {
  const files = [
    { name: '[Content_Types].xml', xml: CONTENT_TYPES_XML },
    { name: '_rels/.rels', xml: ROOT_RELS_XML },
    { name: 'xl/workbook.xml', xml: workbookXml(sheet) },
    { name: 'xl/_rels/workbook.xml.rels', xml: WORKBOOK_RELS_XML },
    { name: 'xl/styles.xml', xml: STYLES_XML },
    { name: 'xl/worksheets/sheet1.xml', xml: sheetXml(sheet) }
  ]
  return zip(
    files.map((f) => ({ name: f.name, data: Buffer.from(f.xml, 'utf8') })),
    at
  )
}
