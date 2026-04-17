export default [
  {
    // Test files — declare vitest globals so linter doesn't flag them
    files: [
      '**/__tests__/**/*',
      '**/*.test.*',
      '**/*.spec.*',
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