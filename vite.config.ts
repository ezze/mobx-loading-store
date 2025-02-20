import path from 'path';

import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';

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
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      entry: path.resolve(__dirname, 'lib/index.ts'),
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['mobx', 'mobx-utils'],
      output: { globals: { mobx: 'mobx', 'mobx-utils': 'mobxUtils' } }
    }
  }
});
