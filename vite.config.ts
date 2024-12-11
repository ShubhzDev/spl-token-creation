import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util'],
    }),
  ],
  optimizeDeps: {
    exclude: ['@coral-xyz/anchor'],
  },
  define: {
    'process.env': {},
    'process.env.BROWSER': true,
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
    },
  },
});