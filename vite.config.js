import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  publicDir: 'public',  // Serve files from public directory
  css: {
    postcss: './postcss.config.js'
  }
})
