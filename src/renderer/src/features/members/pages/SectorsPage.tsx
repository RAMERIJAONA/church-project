import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { getErrorMessage } from '@renderer/lib/error-messages'
import type { SectorDTO } from '@shared/domain/members/sectors.types'
import { toRoman } from '@shared/utils/roman'
import { SectorFormDialog } from '../components/SectorFormDialog'
import { SectorsTable } from '../components/SectorsTable'
import { useCreateSector, useRenameSector, useSectors } from '../queries'

type Dialog = { kind: 'create' } | { kind: 'rename'; sector: SectorDTO }

/** Secteurs : liste, ajout, renommage (porteur, 2026-11-27). */
export function SectorsPage(): React.JSX.Element {
  const sectors = useSectors()
  const create = useCreateSector()
  const rename = useRenameSector()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const open = (next: Dialog | null): void => {
    setServerError(null)
    setDialog(next)
  }
  const options = (
    message: string
  ): { onSuccess: () => void; onError: (err: unknown) => void } => ({
    onSuccess: () => {
      toast.success(message)
      open(null)
    },
    onError: (err: unknown) => setServerError(getErrorMessage(err))
  })
  const submit = (name: string): void => {
    if (dialog?.kind === 'rename') {
      rename.mutate({ id: dialog.sector.id, name }, options('Secteur renommé'))
    } else create.mutate({ name }, options('Secteur ajouté'))
  }
  const list = sectors.data ?? []
  const maxNumber = list.reduce((max, s) => Math.max(max, s.number), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Le numéro romain d’un secteur suit l’ordre de création et ne change jamais.
        </p>
        <Button onClick={() => open({ kind: 'create' })}>
          <Plus aria-hidden />
          Ajouter un secteur
        </Button>
      </div>

      {sectors.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {sectors.isError && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {getErrorMessage(sectors.error)}
          <Button variant="outline" size="sm" onClick={() => void sectors.refetch()}>
            Réessayer
          </Button>
        </div>
      )}
      {sectors.data && list.length === 0 && (
        <p className="rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          Aucun secteur. Créez d’abord un secteur pour pouvoir créer un foyer.
        </p>
      )}
      {list.length > 0 && (
        <SectorsTable sectors={list} onRename={(sector) => open({ kind: 'rename', sector })} />
      )}

      <SectorFormDialog
        open={dialog !== null}
        initial={dialog?.kind === 'rename' ? dialog.sector : null}
        nextNumeral={toRoman(maxNumber + 1)}
        submitting={create.isPending || rename.isPending}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() => open(null)}
      />
    </div>
  )
}
