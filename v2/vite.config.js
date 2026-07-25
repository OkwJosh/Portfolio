import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite config.
 *
 * - `@tailwindcss/vite` is the Tailwind v4 first-party plugin. There is no
 *   `tailwind.config.js` in v4 — the design tokens live in `src/styles/main.css`
 *   inside the `@theme { }` block.
 * - `glsl` files are inlined as JS template strings (see `src/three/glsl/`), so
 *   no shader loader plugin is required.
 */
export default defineConfig({
  server: {
    port: 5174, // 5173 is left free for the React v1 app
    open: true,
  },
  build: {
    target: 'es2022',
    // Three.js is large; splitting it keeps the app chunk cacheable on its own.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          anime: ['animejs'],
        },
      },
    },
  },
  plugins: [tailwindcss()],
});
