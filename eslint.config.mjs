// @ts-check
import { readdirSync, existsSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

// ---------------------------------------------------------------------------
// Frontières entre couches (CLAUDE.md par. 4.2), via no-restricted-imports.
//
// ESLint flat config ne fusionne PAS les options d'une même règle : le dernier bloc
// qui matche un fichier gagne. Chaque bloc ci-dessous contient donc la liste COMPLÈTE
// des interdits de sa couche (on compose les groupes, du général au spécifique).
// ---------------------------------------------------------------------------

/** @param {string} regex @param {string} message */
const ban = (regex, message) => ({ regex, message })

const nodeBuiltins = builtinModules.filter((m) => !m.startsWith('_')).join('|')

const G = {
  // Partout dans src : pas de remontée relative de plus d'un niveau → alias obligatoire.
  // C'est ce qui rend les règles ci-dessous fiables (elles visent les alias).
  deepRelative: [
    ban(
      '^\\.\\./\\.\\./',
      'Import relatif profond interdit : utiliser un alias (@shared, @main, @renderer).'
    )
  ],
  electron: [
    ban(
      '^electron(/.*)?$',
      "electron n'est autorisé que dans main/index.ts, main/ipc, main/adapters et preload."
    )
  ],
  node: [ban(`^(node:.*|(${nodeBuiltins})(/.*)?)$`, 'API Node interdite dans cette couche.')],
  nodeIo: [
    ban(
      '^(node:)?(fs|fs/promises|child_process|os|net|http|https|dgram|cluster|worker_threads)$',
      'Accès OS/disque interdit ici : passer par un adapter (main/adapters) injecté en paramètre.'
    )
  ],
  db: [ban('^(drizzle-orm|better-sqlite3)(/.*)?$', 'Accès DB interdit dans cette couche.')],
  react: [ban('^(react|react-dom)(/.*)?$', 'React interdit dans cette couche.')],
  logMain: [ban('^electron-log(/.*)?$', 'electron-log est réservé au process main.')],
  main: [ban('^@main(/|$)', 'Import de main/** interdit dans cette couche.')],
  renderer: [ban('^@renderer(/|$)', 'Import de renderer/** interdit dans cette couche.')],
  preload: [ban('(^|/)preload(/|$)', 'Import de preload interdit (types uniquement via @shared).')],
  // Couches internes de main (alias + relatif d'un niveau depuis un dossier frère)
  mainLayer: (/** @type {string[]} */ ...layers) =>
    layers.map((l) =>
      ban(
        `^(@main/|\\.\\./)${l}(/|$)`,
        `Import de main/${l} interdit depuis cette couche (CLAUDE.md par. 4.2).`
      )
    ),
  presentational: [
    ban(
      '^\\.\\./(api|queries)$',
      'Composant présentationnel : pas de fetch (props in, events out).'
    ),
    ban(
      '^@renderer/features/[^/]+/(api|queries)$',
      'Composant présentationnel : pas de fetch (props in, events out).'
    ),
    ban(
      '^@renderer/lib/(ipc-client|query-client)$',
      'Composant présentationnel : pas de fetch (props in, events out).'
    ),
    ban(
      '^@tanstack/react-query$',
      'Composant présentationnel : pas de fetch (props in, events out).'
    )
  ]
}

/**
 * @param {string[]} files
 * @param {Array<{regex: string, message: string}>} patterns
 * @param {string[]} [ignores]
 */
const restrict = (files, patterns, ignores) => ({
  files,
  ...(ignores ? { ignores } : {}),
  rules: { 'no-restricted-imports': ['error', { patterns }] }
})

const shared = [
  ...G.deepRelative,
  ...G.electron,
  ...G.node,
  ...G.db,
  ...G.react,
  ...G.logMain,
  ...G.main,
  ...G.renderer,
  ...G.preload
]
const mainBase = [...G.deepRelative, ...G.renderer, ...G.preload, ...G.react]
const renderer = [
  ...G.deepRelative,
  ...G.electron,
  ...G.node,
  ...G.db,
  ...G.logMain,
  ...G.main,
  ...G.preload
]

const featuresDir = 'src/renderer/src/features'
const features = existsSync(featuresDir)
  ? readdirSync(featuresDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : []

const crossFeature = (/** @type {string} */ f) => [
  ban(
    `^@renderer/features/(?!${f}(/|$))`,
    'Import d’une autre feature interdit : passer par components/common ou shared.'
  )
]

const boundaries = [
  restrict(['src/shared/**'], shared),

  // main : par défaut electron et IO OS interdits ; exceptions plus bas
  restrict(['src/main/**'], [...mainBase, ...G.electron]),
  restrict(['src/main/index.ts'], mainBase),
  restrict(
    ['src/main/repositories/**'],
    [
      ...mainBase,
      ...G.electron,
      ...G.nodeIo,
      ...G.mainLayer('services', 'ipc', 'adapters', 'backup')
    ]
  ),
  restrict(
    ['src/main/services/**', 'src/main/backup/**'],
    [...mainBase, ...G.electron, ...G.nodeIo, ...G.mainLayer('ipc')]
  ),
  restrict(['src/main/ipc/**'], [...mainBase, ...G.mainLayer('repositories', 'db')]),
  restrict(
    ['src/main/adapters/**'],
    [...mainBase, ...G.mainLayer('services', 'repositories', 'ipc')]
  ),

  // preload : electron + types partagés, rien d'autre
  restrict(
    ['src/preload/**'],
    [...G.deepRelative, ...G.node, ...G.db, ...G.react, ...G.logMain, ...G.main, ...G.renderer]
  ),

  // renderer
  restrict(['src/renderer/**'], renderer),
  restrict(
    ['src/renderer/src/components/**'],
    [...renderer, ban('^@renderer/features(/|$)', 'components/** ne dépend d’aucune feature.')]
  ),
  ...features.flatMap((f) => [
    restrict([`${featuresDir}/${f}/**`], [...renderer, ...crossFeature(f)]),
    restrict(
      [`${featuresDir}/${f}/components/**`],
      [...renderer, ...crossFeature(f), ...G.presentational]
    )
  ])
]

export default defineConfig(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      '**/coverage',
      '.claude/**',
      '.agents/**',
      'drizzle/**',
      'test-results/**',
      'playwright-report/**'
    ]
  },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true }
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'prettier/prettier': 'error',
      'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }]
    }
  },
  // Exports nommés uniquement dans src (CLAUDE.md par. 12)
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Export nommé uniquement (CLAUDE.md par. 12).'
        }
      ]
    }
  },
  // Primitives shadcn (code vendored, régénérable par le CLI) : règles de style assouplies,
  // les frontières de couches restent actives.
  {
    files: ['src/renderer/src/components/ui/**'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react-refresh/only-export-components': 'off'
    }
  },
  ...boundaries,
  eslintConfigPrettier
)
