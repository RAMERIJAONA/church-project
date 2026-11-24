import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = {
  '@shared': resolve('src/shared'),
  '@main': resolve('src/main'),
  '@renderer': resolve('src/renderer/src'),
  '@tests': resolve('tests')
}

export default defineConfig({
  resolve: { alias },
  test: {
    passWithNoTests: true,
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
      }
    ]
  }
})
