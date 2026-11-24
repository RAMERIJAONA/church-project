import { z } from 'zod'

export const THEMES = ['light', 'dark'] as const
export const ACCENTS = ['indigo', 'green', 'amber', 'rose'] as const
export const DENSITIES = ['comfortable', 'compact'] as const
export const FONT_SIZES = ['small', 'normal', 'large'] as const

export const appSettingsSchema = z.object({
  theme: z.enum(THEMES),
  accent: z.enum(ACCENTS),
  density: z.enum(DENSITIES),
  fontSize: z.enum(FONT_SIZES)
})

export type AppSettings = z.infer<typeof appSettingsSchema>
export type SettingKey = keyof AppSettings
export type Theme = AppSettings['theme']
export type Accent = AppSettings['accent']
export type Density = AppSettings['density']
export type FontSize = AppSettings['fontSize']

/** Modification partielle ; clés inconnues refusées. */
export const appSettingsPatchSchema = appSettingsSchema.partial().strict()
export type AppSettingsPatch = z.infer<typeof appSettingsPatchSchema>
