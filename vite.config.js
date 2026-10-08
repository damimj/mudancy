import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    exclude: ['node_modules', 'tests/**'],
    coverage: {
      provider: 'v8',
      // Measure all app code, not just the files a test happens to import.
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.js', 'src/test/**', 'src/main.jsx'],
      reporter: ['text', 'html'],
    },
  },
})
