import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  css: {
    // Workaround to prevent Vitest from erroring on Tailwind v4 CSS imports without a PostCSS setup
    postcss: path.resolve(__dirname, '.vitest')
  },
  test: {
    environment: 'node',
  }
})
