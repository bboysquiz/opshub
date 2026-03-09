import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.output/**', '**/coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    files: [
      'apps/host-nuxt/app/app.vue',
      'apps/host-nuxt/app/pages/**/*.vue',
      'apps/host-nuxt/app/layouts/**/*.vue',
    ],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
