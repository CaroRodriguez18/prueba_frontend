// .eslintrc.cjs
module.exports = {
  root: true,
  env: { node: true, browser: true, es2021: true },
  extends: ['plugin:vue/vue3-essential', 'eslint:recommended'],
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,   // <- clave
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {},
  ignorePatterns: ['dist/', 'node_modules/'],
};
