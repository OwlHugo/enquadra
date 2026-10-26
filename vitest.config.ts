import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'evals/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/domain/src/**'],
      thresholds: { lines: 90, branches: 85 },
    },
  },
})
