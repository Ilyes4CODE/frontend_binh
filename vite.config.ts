import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // A build is for the live site, whatever the environment says. cPanel's Node
  // app sets NODE_ENV to "development" through its npm wrapper, which no prefix
  // on the command line gets past, and Vite reads it to decide whether a build
  // is a production one: the site shipped React's development build and its
  // debugging JSX runtime — 1.3 MB instead of 1 MB, slower, and printing
  // developer messages in every visitor's console. Set here, before Vite makes
  // that decision, so no environment can undo it.
  if (command === 'build') process.env.NODE_ENV = 'production'

  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  }
})
