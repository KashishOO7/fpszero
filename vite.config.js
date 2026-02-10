import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        terminal: resolve(__dirname, 'terminal.html')
      },
      output: {
        manualChunks: {
          vendor: ['three', 'gsap']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
