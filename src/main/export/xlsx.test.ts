import { describe, expect, it } from 'vitest'
import { unzip } from '@tests/helpers/unzip'
import { buildXlsx, CELL_STYLES, columnName, safeSheetName } from './xlsx'

const AT = new Date(2026, 10, 25, 14, 30, 0)

describe('classeur Excel (.xlsx)', () => {
  it('archive zip lisible avec les parties attendues d’un classeur', () => {
    const files = unzip(buildXlsx({ name: 'Comptabilité', columnWidths: [10], rows: [] }, AT))
    expect([...files.keys()].sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml'
    ])
    expect(files.get('xl/workbook.xml')).toContain('<sheet name="Comptabilité" sheetId="1"')
  })

  it('écrit les nombres en nombres et le texte échappé, cases vides omises', () => {
    const files = unzip(
      buildXlsx(
        {
          name: 'Feuille',
          columnWidths: [10, 40, 20],
          rows: [
            [
              { value: 'A1', style: 'bold' },
              { value: 'Fety & <Noely> "2026"' },
              { value: 1500000, style: 'amount' }
            ],
            [{ value: 'A1-1' }, { value: null }, { value: 0, style: 'amountBold' }]
          ]
        },
        AT
      )
    )
    const sheet = files.get('xl/worksheets/sheet1.xml') ?? ''
    const s = (style: (typeof CELL_STYLES)[number]): number => CELL_STYLES.indexOf(style)
    expect(sheet).toContain(`<c r="C1" s="${s('amount')}"><v>1500000</v></c>`)
    expect(sheet).toContain(`<c r="C2" s="${s('amountBold')}"><v>0</v></c>`)
    expect(sheet).toContain('Fety &amp; &lt;Noely&gt; &quot;2026&quot;')
    expect(sheet).toContain(`<c r="A1" s="${s('bold')}" t="inlineStr">`)
    expect(sheet).not.toContain('r="B2"')
    expect(sheet).toContain('<col min="2" max="2" width="40" customWidth="1"/>')
  })

  it('montants affichés « 2 000 000 Ar » ; un style par entrée de CELL_STYLES', () => {
    const styles =
      unzip(buildXlsx({ name: 'F', columnWidths: [], rows: [] }, AT)).get('xl/styles.xml') ?? ''
    expect(styles).toContain('formatCode="#,##0&quot; Ar&quot;"')
    expect(styles).toContain(`<cellXfs count="${CELL_STYLES.length}">`)
    expect(styles.match(/<xf /g)?.length).toBe(CELL_STYLES.length + 1) // + cellStyleXfs
  })

  it('lignes d’en-tête figées et répétées à chaque page imprimée', () => {
    const files = unzip(
      buildXlsx({ name: 'Compta', columnWidths: [], rows: [], headerRows: 4 }, AT)
    )
    expect(files.get('xl/worksheets/sheet1.xml')).toContain(
      '<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>'
    )
    expect(files.get('xl/workbook.xml')).toContain(
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">'Compta'!$1:$4</definedName>`
    )
  })

  it('retire les caractères interdits en XML', () => {
    const files = unzip(
      buildXlsx({ name: 'F', columnWidths: [], rows: [[{ value: 'a\u0001b' }]] }, AT)
    )
    expect(files.get('xl/worksheets/sheet1.xml')).toContain('>ab</t>')
  })

  it('noms de colonnes et d’onglet acceptés par Excel', () => {
    expect([0, 25, 26, 27, 701].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ'])
    expect(safeSheetName('Compta [2026]: A/B')).toBe('Compta  2026   A B')
    expect(safeSheetName('x'.repeat(40))).toHaveLength(31)
    expect(safeSheetName('  ')).toBe('Feuille 1')
  })
})
