import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from './api'

export const backupKeys = {
  all: ['backups'] as const,
  list: () => [...backupKeys.all, 'list'] as const
}

export function useBackups() {
  return useQuery({ queryKey: backupKeys.list(), queryFn: maintenanceApi.listBackups })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: maintenanceApi.createBackup,
    onSettled: () => qc.invalidateQueries({ queryKey: backupKeys.all })
  })
}

export function useExportBackup() {
  return useMutation({ mutationFn: maintenanceApi.exportBackup })
}

export function useRestoreBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: maintenanceApi.restoreBackup,
    onSettled: () => qc.invalidateQueries({ queryKey: backupKeys.all })
  })
}

export function useOpenBackupsFolder() {
  return useMutation({ mutationFn: maintenanceApi.openBackupsFolder })
}

export function useOpenLogsFolder() {
  return useMutation({ mutationFn: maintenanceApi.openLogsFolder })
}
