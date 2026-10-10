import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        unsafe_math: false, // Guarantees 100% exact math & coordinate precision
      },
      mangle: {
        toplevel: true, // Obfuscates all top-level variables and internal functions
      },
      format: {
        comments: false, // Completely removes all comments & copyright notes
      },
    },
  },
})
