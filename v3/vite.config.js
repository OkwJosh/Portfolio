import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { seoPlugin } from './plugins/seo.js';

export default defineConfig({
  server: {
    // 5173 is the v1 React app, 5174 is v2.
    port: 5175,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three + the r3f ecosystem dwarf the app code; splitting them keeps
        // the app chunk independently cacheable.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          motion: ['@react-spring/three', '@react-spring/web', 'gsap'],
        },
      },
    },
  },
  plugins: [react(), tailwindcss(), seoPlugin()],
});
