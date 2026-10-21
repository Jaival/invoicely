import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { expect, it } from 'vitest'

// The only modules that may query the database. Pages, components and
// actions go through them with the session's organization, and every
// function in them except Better Auth's is probed by
// tenant-isolation.db.test.ts. Adding a module here means adding it there.
const dataAccess = [
  'src/lib/auth.ts',
  'src/lib/clients/queries.ts',
  'src/lib/invoices/queries.ts',
  'src/lib/organization.ts',
]

// A value import (not `import type`) of the database, its schema or the
// query builder.
const databaseImport =
  /^(?:import|export)(?!\s+type\b)[^']*?\bfrom\s+'(?:@\/db(?:\/[^']*)?|drizzle-orm(?:\/[^']*)?|pg)'/m

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

it('queries the database only from the data access modules', () => {
  const importers = sourceFiles('src')
    .map((path) => relative('.', path).split(sep).join('/'))
    // The schema, migrations' seed and tests use the database directly.
    .filter(
      (path) =>
        !path.startsWith('src/db/') &&
        !path.startsWith('src/test/') &&
        !/\.test\.tsx?$/.test(path),
    )
    .filter((path) => databaseImport.test(readFileSync(path, 'utf8')))

  expect(importers.toSorted()).toEqual(dataAccess)
})
