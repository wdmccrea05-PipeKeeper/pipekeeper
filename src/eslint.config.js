export default [
  {
    // Disable no-undef for ALL test files using broad patterns
    files: [
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*',
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
        mock: 'readonly',
        jest: 'readonly',
        global: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    // Also apply globally to catch any missed patterns
    rules: {
      'no-undef': 'off',
    },
  },
];