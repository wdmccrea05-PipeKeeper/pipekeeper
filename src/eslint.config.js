export default [
  {
    // Test files — declare vitest globals so linter doesn't flag them
    files: [
      '**/__tests__/**/*',
      '**/__tests__/**/*.jsx',
      '**/__tests__/**/*.tsx',
      '**/__tests__/**/*.js',
      '**/__tests__/**/*.ts',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        suite: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];