import * as z from 'zod'

// How the app looks, saved on the account so it follows the user to every
// device. Light and dark mode stay separate, saved in each browser.
export const styles = ['clean', 'brutal'] as const
export type Style = (typeof styles)[number]

// Palettes only apply to the Brutal style; Clean keeps its own colors.
export const palettes = ['emerald', 'sunshine'] as const
export type Palette = (typeof palettes)[number]

export const appearanceSchema = z.object({
  style: z.enum(styles),
  palette: z.enum(palettes),
})

export type Appearance = z.infer<typeof appearanceSchema>

export const defaultAppearance: Appearance = {
  style: 'clean',
  palette: 'emerald',
}

// Reads the user's saved appearance, falling back to the default for
// anything missing or no longer offered.
export function userAppearance(
  user: { uiStyle?: string | null; uiPalette?: string | null } | undefined,
): Appearance {
  const style = z.enum(styles).safeParse(user?.uiStyle)
  const palette = z.enum(palettes).safeParse(user?.uiPalette)
  return {
    style: style.success ? style.data : defaultAppearance.style,
    palette: palette.success ? palette.data : defaultAppearance.palette,
  }
}

// The attributes globals.css keys the style off, for <html> or any element
// that should look different from the page around it. Clean sets none.
export function appearanceAttributes({ style, palette }: Appearance) {
  return style === 'clean'
    ? {}
    : { 'data-style': style, 'data-palette': palette }
}
