// A LIKE pattern matching values that contain `term` literally. Backslash
// is Postgres's default LIKE escape, and % and _ are wildcards.
export function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`
}
