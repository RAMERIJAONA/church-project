import { SegmentedControl } from '@renderer/components/common/SegmentedControl'
import { withStatus, type Statuses } from '@shared/domain/members/members.rules'
import { FormField } from './FormField'

export interface StatusFieldsProps {
  value: Statuses
  onChange: (value: Statuses) => void
  /** Avertissement sous Diacre (foyers qui perdront leur parrain) */
  deaconWarning?: string
}

const YES_NO = [
  { value: 'yes', label: 'Oui' },
  { value: 'no', label: 'Non' }
] as const

type Key = keyof Statuses

/**
 * Baptisé, Communiant, Diacre, pas à pas (porteur, 2026-11-27) : Communiant n'est possible
 * qu'une fois baptisé, Diacre qu'une fois communiant (grisés à Non sinon). Non en cascade :
 * Baptisé Non remet Communiant et Diacre à Non, Communiant Non remet Diacre à Non (`withStatus`).
 */
export function StatusFields({
  value,
  onChange,
  deaconWarning
}: StatusFieldsProps): React.JSX.Element {
  const set = (key: Key, on: boolean): void => onChange(withStatus(value, key, on))
  const locked: Record<Key, boolean> = {
    baptized: false,
    communicant: !value.baptized,
    deacon: !value.communicant
  }
  const hints: Record<Key, string | undefined> = {
    baptized: undefined,
    communicant: locked.communicant ? 'Seul un fidèle baptisé peut être communiant.' : undefined,
    deacon: locked.deacon ? 'Seul un communiant peut être diacre.' : undefined
  }
  const field = (key: Key, label: string, warning?: string): React.JSX.Element => (
    <FormField id={`member-${key}`} label={label} hint={warning ?? hints[key]}>
      <SegmentedControl
        label={label}
        value={value[key] ? 'yes' : 'no'}
        options={YES_NO}
        disabled={locked[key]}
        onValueChange={(v) => set(key, v === 'yes')}
      />
    </FormField>
  )
  return (
    <>
      {field('baptized', 'Baptisé')}
      {field('communicant', 'Communiant')}
      {field('deacon', 'Diacre', deaconWarning)}
    </>
  )
}
