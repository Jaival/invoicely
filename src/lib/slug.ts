// URL-safe slug from a display name, with a random suffix so two people
// called "Alex" don't collide on the unique slug column.
export function organizationSlug(name: string, suffix = randomSuffix()) {
  const base = name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return base ? `${base}-${suffix}` : suffix
}

function randomSuffix() {
  return crypto.randomUUID().slice(0, 8)
}
