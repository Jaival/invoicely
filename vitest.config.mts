import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.db.test.ts'],
        },
      },
      {
        // Runs against a real, migrated Postgres (`bun run test:db`). Each
        // test file creates its own organizations and deletes them after.
        test: {
          name: 'db',
          include: ['src/**/*.db.test.ts'],
          setupFiles: ['./src/test/load-env.ts'],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      // Money math must be fully covered; a gap fails the run.
      thresholds: { 'src/lib/money.ts': { 100: true } },
    },
  },
})
