import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/server.js'], // point d'entrée réseau, non testé unitairement
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
})
