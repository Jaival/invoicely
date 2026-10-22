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

// The attributes globals.css keys the style off, for <html>. Clean sets
// none, so pages look as they always have.
export function appearanceAttributes({ style, palette }: Appearance) {
  return style === 'clean'
    ? {}
    : { 'data-style': style, 'data-palette': palette }
}

// The same for an element that should look different from the page around
// it, like a public invoice. Clean is set too, to undo a Brutal page.
export function appearanceScope(appearance: Appearance) {
  return { 'data-style': appearance.style, ...appearanceAttributes(appearance) }
}

// How a business's invoices look to its clients, on the public page and in
// the PDF: always Clean, or the same style the owner uses in the app.
export const publicStyles = ['clean', 'match'] as const
export type PublicStyle = (typeof publicStyles)[number]

export function publicAppearance(
  publicStyle: PublicStyle,
  owner: Parameters<typeof userAppearance>[0],
): Appearance {
  return publicStyle === 'match' ? userAppearance(owner) : defaultAppearance
}
