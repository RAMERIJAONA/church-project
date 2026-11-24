import { isRouteErrorResponse } from 'react-router'
import { getErrorCode } from '@renderer/lib/error-messages'
import { APP_NAME } from '@shared/domain/identity'

export interface ErrorDetailsInput {
  error: unknown
  route: string
  version: string
  at: Date
}

/** Texte collé par l'utilisateur dans un message : assez pour retrouver la cause dans les logs. */
export function buildErrorDetails({ error, route, version, at }: ErrorDetailsInput): string {
  let message: string
  let stack: string | undefined
  if (isRouteErrorResponse(error)) message = `${error.status} ${error.statusText}`
  else if (error instanceof Error) {
    message = error.message
    stack = error.stack
  } else message = String(error)

  return [
    `${APP_NAME} ${version}`,
    `Date : ${at.toISOString()}`,
    `Écran : ${route}`,
    `Code : ${getErrorCode(error)}`,
    `Message : ${message}`,
    ...(stack ? ['', stack] : [])
  ].join('\n')
}
