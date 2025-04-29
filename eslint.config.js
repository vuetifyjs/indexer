import { defineConfig } from 'eslint';
import { flatConfig } from '@typescript-eslint/eslint-plugin';

export default defineConfig([
  {
    root: true,
    env: {
      node: true,
    },
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'semi-colon': 'error',
    },
  },
]);
