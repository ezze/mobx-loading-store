import { Linter } from 'eslint';
import prettier from 'eslint-config-ezze-prettier';
import typeScript from 'eslint-config-ezze-ts';
import globals from 'globals';

const config: Array<Linter.Config> = [
  ...typeScript,
  ...prettier,
  {
    rules: {
      '@stylistic/js/max-len': ['error', { code: 120, ignoreComments: true }]
    }
  }
];

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  ...config
];
