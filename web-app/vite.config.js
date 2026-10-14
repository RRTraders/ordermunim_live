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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('@pdf-lib')) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx') || id.includes('jszip')) {
              return 'vendor-sheets';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  },
})
