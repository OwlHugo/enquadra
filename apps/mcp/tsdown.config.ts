import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  dts: false,
  // Os pacotes @enquadra/* são do monorepo e não vão para o npm: entram no bundle.
  noExternal: [/^@enquadra\//],
})
