import { describe, expect, it } from 'vitest'
import {
  appearanceAttributes,
  appearanceScope,
  publicAppearance,
  userAppearance,
} from './appearance'

const fallback = { style: 'clean', palette: 'emerald', strength: 'full' }

describe('userAppearance', () => {
  it('reads the saved style, palette and strength', () => {
    expect(
      userAppearance({
        uiStyle: 'brutal',
        uiPalette: 'sunshine',
        uiStrength: 'loud',
      }),
    ).toEqual({ style: 'brutal', palette: 'sunshine', strength: 'loud' })
  })

  it('falls back to Clean, Emerald and Full when signed out or unset', () => {
    expect(userAppearance(undefined)).toEqual(fallback)
    expect(
      userAppearance({ uiStyle: null, uiPalette: null, uiStrength: null }),
    ).toEqual(fallback)
  })

  it('ignores values that are no longer offered', () => {
    expect(
      userAppearance({
        uiStyle: 'retro',
        uiPalette: 'neon',
        uiStrength: 'max',
      }),
    ).toEqual(fallback)
  })
})

describe('appearanceAttributes', () => {
  it('sets nothing for Clean, so pages look as before', () => {
    expect(
      appearanceAttributes({
        style: 'clean',
        palette: 'sunshine',
        strength: 'loud',
      }),
    ).toEqual({})
  })

  it('sets the palette for Brutal, and the strength when Loud', () => {
    expect(
      appearanceAttributes({
        style: 'brutal',
        palette: 'emerald',
        strength: 'full',
      }),
    ).toEqual({ 'data-style': 'brutal', 'data-palette': 'emerald' })
    expect(
      appearanceAttributes({
        style: 'brutal',
        palette: 'sunshine',
        strength: 'loud',
      }),
    ).toEqual({
      'data-style': 'brutal',
      'data-palette': 'sunshine',
      'data-strength': 'loud',
    })
  })
})

describe('appearanceScope', () => {
  it('sets Clean and Full too, to undo a Brutal or Loud page around it', () => {
    expect(
      appearanceScope({
        style: 'clean',
        palette: 'sunshine',
        strength: 'loud',
      }),
    ).toEqual({ 'data-style': 'clean' })
    expect(
      appearanceScope({
        style: 'brutal',
        palette: 'emerald',
        strength: 'full',
      }),
    ).toEqual({
      'data-style': 'brutal',
      'data-palette': 'emerald',
      'data-strength': 'full',
    })
  })
})

describe('publicAppearance', () => {
  const owner = { uiStyle: 'brutal', uiPalette: 'sunshine', uiStrength: 'loud' }

  it("follows the owner's style when set to match", () => {
    expect(publicAppearance('match', owner)).toEqual({
      style: 'brutal',
      palette: 'sunshine',
      strength: 'loud',
    })
  })

  it('stays Clean otherwise, or without an owner', () => {
    expect(publicAppearance('clean', owner)).toEqual(fallback)
    expect(publicAppearance('match', undefined)).toEqual(fallback)
  })
})
