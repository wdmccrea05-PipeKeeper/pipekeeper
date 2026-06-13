module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
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
    jest: 'readonly',
    process: 'readonly',
    global: 'readonly',
    globalThis: 'readonly',
  },
  rules: {
    'no-undef': 'off',
    'no-unused-vars': 'off',
  },
};