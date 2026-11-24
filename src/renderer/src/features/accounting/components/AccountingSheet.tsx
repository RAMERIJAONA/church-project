import type { AccountingSectionDTO } from '@shared/domain/accounting/accounting.types'
import { AddLineRow } from './AddLineRow'
import { LineRow } from './LineRow'
import { SectionRow } from './SectionRow'
import { col, headCell } from './accounting.styles'

export interface AccountingSheetProps {
  year: number
  sections: AccountingSectionDTO[]
  /** Rubrique dont le formulaire d'ajout de ligne est ouvert */
  addingLineTo: number | null
}

/**
 * Tableau Numéro | Description | Montant de l'année. Une rubrique = un <tbody> (rubrique,
 * ses lignes, puis la rangée d'ajout). Liste non virtualisée : un plan comptable reste bien
 * en dessous de 200 lignes (CLAUDE.md par. 2) ; à revoir s'il dépasse.
 */
export function AccountingSheet({
  year,
  sections,
  addingLineTo
}: AccountingSheetProps): React.JSX.Element {
  return (
    // overflow-clip : coins arrondis sans créer de conteneur de défilement (l'en-tête reste collant)
    <div className="overflow-clip rounded-xl border bg-card text-sm">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Comptabilité {year}</caption>
        <colgroup>
          <col className={col.code} />
          <col />
          <col className={col.amount} />
          <col className={col.actions} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={headCell()}>
              N°
            </th>
            <th scope="col" className={headCell()}>
              Description
            </th>
            <th scope="col" aria-label={`Montant ${year}`} className={headCell({ align: 'right' })}>
              {year}
            </th>
            <th scope="col" className={headCell()}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {sections.map((section, i) => {
          const prev = sections[i - 1]
          const next = sections[i + 1]
          return (
            <tbody key={section.id} id={`rubrique-${section.id}`}>
              <SectionRow
                section={section}
                isFirst={prev?.prefix !== section.prefix}
                isLast={next?.prefix !== section.prefix}
              />
              {section.lines.map((line, j) => (
                <LineRow
                  key={line.id}
                  line={line}
                  isFirst={j === 0}
                  isLast={j === section.lines.length - 1}
                />
              ))}
              <AddLineRow section={section} open={addingLineTo === section.id} />
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
