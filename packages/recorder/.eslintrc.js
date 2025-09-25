module.exports = {
  extends: [
    'eslint:recommended'
  ],
  parser: '@typescript-eslint/parser',
  env: {
    node: true,
    browser: true,
    es2020: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'off', // Turn off base rule to avoid conflicts
    'no-console': 'off',
  },
}
