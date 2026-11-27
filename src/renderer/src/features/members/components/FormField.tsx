import type { ReactNode } from 'react'
import { Label } from '@renderer/components/ui/label'

export interface FormFieldProps {
  /** Id du champ (`htmlFor`) ; l'id du message est `${id}-error` */
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}

/** Libellé + champ + aide ou message d'erreur sous le champ. */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children
}: FormFieldProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={id} id={`${id}-label`}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
