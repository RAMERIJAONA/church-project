import { SegmentedControl } from '@renderer/components/common/SegmentedControl'
import { applyStatusRules, type Statuses } from '@shared/domain/members/members.rules'
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
 * Baptisé, Communiant, Diacre (porteur, 2026-11-27) : activer un statut active ceux qu'il exige
 * et les verrouille tant qu'il est actif ; désactiver ne retire rien (`applyStatusRules`).
 */
export function StatusFields({
  value,
  onChange,
  deaconWarning
}: StatusFieldsProps): React.JSX.Element {
  const set = (key: Key, on: boolean): void => onChange(applyStatusRules({ ...value, [key]: on }))
  const locked: Record<Key, boolean> = {
    baptized: value.communicant || value.deacon,
    communicant: value.deacon,
    deacon: false
  }
  const hints: Record<Key, string | undefined> = {
    baptized: locked.baptized ? 'Un communiant est toujours baptisé.' : undefined,
    communicant: locked.communicant ? 'Un diacre est toujours communiant.' : undefined,
    deacon: undefined
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
