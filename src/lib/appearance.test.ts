import { describe, expect, it } from 'vitest'
import {
  appearanceAttributes,
  appearanceScope,
  publicAppearance,
  userAppearance,
} from './appearance'

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

describe('appearanceScope', () => {
  it('sets Clean too, to undo a Brutal page around it', () => {
    expect(appearanceScope({ style: 'clean', palette: 'sunshine' })).toEqual({
      'data-style': 'clean',
    })
    expect(appearanceScope({ style: 'brutal', palette: 'emerald' })).toEqual({
      'data-style': 'brutal',
      'data-palette': 'emerald',
    })
  })
})

describe('publicAppearance', () => {
  const owner = { uiStyle: 'brutal', uiPalette: 'sunshine' }

  it("follows the owner's style when set to match", () => {
    expect(publicAppearance('match', owner)).toEqual({
      style: 'brutal',
      palette: 'sunshine',
    })
  })

  it('stays Clean otherwise, or without an owner', () => {
    const clean = { style: 'clean', palette: 'emerald' }
    expect(publicAppearance('clean', owner)).toEqual(clean)
    expect(publicAppearance('match', undefined)).toEqual(clean)
  })
})
