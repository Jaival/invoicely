// Which deployment an event came from: Vercel's `production` or `preview`,
// or `local` for a developer machine or CI. Set explicitly because the edge
// SDK ignores Vercel's variables, and a local `next start` would otherwise
// report itself as production. NEXT_PUBLIC_VERCEL_ENV is inlined at build,
// so this also works in the browser.
export const sentryEnvironment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? 'local'
