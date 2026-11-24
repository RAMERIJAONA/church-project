import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@shared': resolve('src/shared'),
  '@main': resolve('src/main'),
  '@renderer': resolve('src/renderer/src'),
  '@tests': resolve('tests')
}

// `npm run seed:accounting` : base de démonstration dans .dev-data/seed (jamais lancé par `npm test`)
const seedProject = {
  extends: true,
  test: { name: 'seed', environment: 'node', include: ['scripts/seed-accounting.task.ts'] }
}

// `npm run fixture:snapshot` : projet dédié qui génère une fixture DB (jamais lancé par `npm test`)
const fixtureProject = {
  extends: true,
  test: { name: 'fixtures', environment: 'node', include: ['scripts/fixture-snapshot.task.ts'] }
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'shared', environment: 'node', include: ['src/shared/**/*.test.ts'] }
      },
      {
        extends: true,
        test: {
          name: 'main',
          environment: 'node',
          include: [
            'src/main/**/*.test.ts',
            'tests/integration/**/*.test.ts',
            'tests/regression/**/*.test.ts'
          ]
        }
      },
      {
        extends: true,
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup/renderer.ts']
        }
      },
      ...(process.env['FIXTURE_SNAPSHOT'] === '1' ? [fixtureProject] : []),
      ...(process.env['SEED_ACCOUNTING'] === '1' ? [seedProject] : [])
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', 'src/renderer/src/components/ui/**'],
      reporter: ['text-summary', 'html'],
      // Seuils bloquants (CLAUDE.md par. 9.2). Pas de seuil sur l'UI.
      thresholds: {
        'src/shared/domain/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/main/services/**': { lines: 80, functions: 80, branches: 80, statements: 80 }
      }
    }
  }
})
