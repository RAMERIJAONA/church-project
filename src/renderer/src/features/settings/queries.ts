import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppSettings, AppSettingsPatch } from '@shared/domain/settings/settings.types'
import { settingsApi } from './api'

/** Query key factory : seule source des clés de cette feature. */
export const settingsKeys = {
  all: ['settings'] as const,
  current: () => [...settingsKeys.all, 'current'] as const
}

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.current(), queryFn: settingsApi.get })
}

/** Mise à jour optimiste : le thème change instantanément, rollback si l'écriture échoue. */
export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: AppSettingsPatch) => settingsApi.update(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: settingsKeys.current() })
      const previous = qc.getQueryData<AppSettings>(settingsKeys.current())
      if (previous) qc.setQueryData<AppSettings>(settingsKeys.current(), { ...previous, ...patch })
      return { previous }
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(settingsKeys.current(), context.previous)
    },
    onSuccess: (saved) => qc.setQueryData(settingsKeys.current(), saved)
  })
}
