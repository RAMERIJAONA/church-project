import {
  ageOn,
  formatAge,
  formatBirthDate,
  memberDisplayName
} from '@shared/domain/members/members.rules'
import type { MemberDTO } from '@shared/domain/members/members.types'
import { deaconBadge, openButton, subText } from './members.styles'

/** Cellule « Fidèle » : nom et prénom (ouvre la fiche), badge Diacre, adresse en dessous. */
export function PersonCell({
  member,
  showDeacon,
  onOpen
}: {
  member: MemberDTO
  showDeacon: boolean
  onOpen: () => void
}): React.JSX.Element {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <button type="button" className={openButton} onClick={onOpen}>
          {memberDisplayName(member)}
        </button>
        {showDeacon && member.deacon && <span className={deaconBadge}>Diacre</span>}
      </div>
      <div className={subText}>{member.address}</div>
    </>
  )
}

/** Cellule « Naissance » : date, et l'âge en dessous. */
export function BirthCell({
  birthDate,
  today
}: {
  birthDate: string
  today: string
}): React.JSX.Element {
  return (
    <>
      <div className="whitespace-nowrap tabular-nums">{formatBirthDate(birthDate)}</div>
      <div className={subText}>{formatAge(ageOn(birthDate, today))}</div>
    </>
  )
}
