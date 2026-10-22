import { describe, expect, it } from 'vitest'
import { appearanceAttributes, userAppearance } from './appearance'

describe('userAppearance', () => {
  it('reads the saved style and palette', () => {
    expect(
      userAppearance({ uiStyle: 'brutal', uiPalette: 'sunshine' }),
    ).toEqual({ style: 'brutal', palette: 'sunshine' })
  })

  it('falls back to Clean and Emerald when signed out or unset', () => {
    const fallback = { style: 'clean', palette: 'emerald' }
    expect(userAppearance(undefined)).toEqual(fallback)
    expect(userAppearance({ uiStyle: null, uiPalette: null })).toEqual(fallback)
  })

  it('ignores values that are no longer offered', () => {
    expect(userAppearance({ uiStyle: 'loud', uiPalette: 'neon' })).toEqual({
      style: 'clean',
      palette: 'emerald',
    })
  })
})

describe('appearanceAttributes', () => {
  it('sets nothing for Clean, so pages look as before', () => {
    expect(
      appearanceAttributes({ style: 'clean', palette: 'sunshine' }),
    ).toEqual({})
  })

  it('sets the style and palette for Brutal', () => {
    expect(
      appearanceAttributes({ style: 'brutal', palette: 'sunshine' }),
    ).toEqual({ 'data-style': 'brutal', 'data-palette': 'sunshine' })
  })
})
