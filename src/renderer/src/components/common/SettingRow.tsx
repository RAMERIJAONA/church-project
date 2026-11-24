import type { ReactNode } from 'react'

export interface SettingRowProps {
  title: string
  description?: string
  /** id du titre, pour relier le contrôle (aria-labelledby) si besoin */
  titleId?: string
  children: ReactNode
}

/** Ligne de réglage : libellé + description à gauche, contrôle à droite. */
export function SettingRow({
  title,
  description,
  titleId,
  children
}: SettingRowProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4">
      <div className="min-w-56 flex-1">
        <p id={titleId} className="text-sm font-medium">
          {title}
        </p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
