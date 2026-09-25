import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // L'API a sa propre config vitest : on ne la lance pas depuis la racine
    include: ['tests/**/*.test.js'],
    exclude: ['api/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      // text : lisible dans les logs du job GitHub Actions
      // lcov : résumé dans $GITHUB_STEP_SUMMARY, artefact téléchargeable
      // cobertura : format XML standard (Jenkins, GitLab, SonarQube…)
      reporter: ['text', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/app.js'], // app.js contient du DOM, testé manuellement
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
