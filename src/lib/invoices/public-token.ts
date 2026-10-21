import { randomBytes } from 'node:crypto'

// 24 random bytes (192 bits) as 32 URL-safe characters: far too many to
// guess, short enough to share.
export const newPublicToken = () => randomBytes(24).toString('base64url')

export const isPublicToken = (value: string) => /^[\w-]{32}$/.test(value)
