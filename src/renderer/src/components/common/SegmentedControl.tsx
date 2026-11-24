import { RadioGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { segmentedItem, segmentedRoot } from './segmented-control.styles'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  /** Nom accessible du groupe (lu par les lecteurs d'écran). */
  label: string
  value: T
  options: ReadonlyArray<SegmentedOption<T>>
  onValueChange: (value: T) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

/** Choix exclusif court (2 à 4 options) : radiogroup clavier (flèches) natif via Radix. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
  size
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      disabled={disabled}
      orientation="horizontal"
      className={segmentedRoot()}
      onValueChange={(v) => {
        const option = options.find((o) => o.value === v)
        if (option) onValueChange(option.value)
      }}
    >
      {options.map((o) => (
        <RadioGroup.Item key={o.value} value={o.value} className={segmentedItem({ size })}>
          {o.icon}
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
