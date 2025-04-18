import path from 'path';

import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';

function getFileNameExtensionByFormat(format: string): string {
  if (format === 'cjs') {
    return '.cjs';
  }
  if (format === 'es') {
    return '.es.js';
  }
  if (format === 'umd') {
    return '.umd.js';
  }
  return '.js';
}

export default defineConfig({
  plugins: [
    dts({ include: ['lib'] }),
    checker({
      typescript: {
        tsconfigPath: './tsconfig.json'
      },
      eslint: { lintCommand: 'eslint lib', useFlatConfig: true }
    })
  ],
  build: {
    lib: {
      name: 'MobXLoadingStore',
      fileName: (format, entryName) => `${entryName}${getFileNameExtensionByFormat(format)}`,
      entry: path.resolve(__dirname, 'lib/index.ts'),
      formats: ['cjs', 'es', 'umd']
    },
    rollupOptions: {
      external: ['mobx', 'mobx-utils'],
      output: { globals: { mobx: 'mobx', 'mobx-utils': 'mobxUtils' } }
    }
  }
});
