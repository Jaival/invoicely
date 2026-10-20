// "Ada Lovelace" -> "AL", "Cher" -> "C". Used as the avatar fallback.
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return (
    picked
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  )
}
