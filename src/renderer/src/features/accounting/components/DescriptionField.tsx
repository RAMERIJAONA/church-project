import { useRef, useState } from 'react'
import { Input } from '@renderer/components/ui/input'
import type { z } from 'zod'
import { descriptionSchema } from '@shared/domain/accounting/accounting.types'

export interface DescriptionFieldProps {
  initialValue: string
  label: string
  /** Validation et normalisation (ex. majuscules pour une rubrique) */
  schema?: z.ZodType<string, string>
  className?: string
  /** `null` : annulé, ou description vide/inchangée */
  onDone: (description: string | null) => void
}

/**
 * Champ d'édition d'une description, monté uniquement pendant l'édition (état neuf à chaque
 * ouverture). Entrée ou sortie du champ : valide. Échap : annule. Vide : refusé.
 */
export function DescriptionField({
  initialValue,
  label,
  schema = descriptionSchema,
  className,
  onDone
}: DescriptionFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(initialValue)
  // Une seule fin d'édition : Échap puis blur au démontage ne doit pas enregistrer
  const finished = useRef(false)

  const finish = (save: boolean): void => {
    if (finished.current) return
    finished.current = true
    const parsed = schema.safeParse(draft)
    onDone(save && parsed.success && parsed.data !== initialValue ? parsed.data : null)
  }

  return (
    <Input
      autoFocus
      aria-label={label}
      className={className}
      maxLength={200}
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          finish(false)
        }
      }}
    />
  )
}
