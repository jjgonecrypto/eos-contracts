module.exports = {
  extends: ['last', 'plugin:import/errors'],
  parserOptions: {
    sourceType: 'script',
  },
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  rules: {
    'no-console': 'off',
    'prettier/prettier': 'off',
    semi: 'error',
    strict: ['error', 'global'],
    'import/no-unresolved': ['error', { commonjs: true }],
    'prefer-arrow-callback': 'error',
    'space-before-blocks': ['error', 'always'],
    'prefer-const': 'error',
    'no-shadow': 'error',
    quotes: ['error', 'single'],
  },
};
