export default [
  {
    // Test files — declare vitest globals so linter doesn't flag them
    files: ['**/*.test.js', '**/*.test.jsx', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.js', '**/*.spec.jsx', '**/__tests__/**/*.js', '**/__tests__/**/*.jsx', '**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
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
      },
    },
  },
];