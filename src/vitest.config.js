import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.js'],
    // Force exit after all tests complete — prevents open handle hangs
    // from React Query polling, event listeners, storage listeners, etc.
    forceExit: true,
    // Generous timeout for async tests but not infinite
    testTimeout: 15000,
    hookTimeout: 10000,
    // Run files in parallel threads but isolate each file
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true,
      },
    },
    // Only pick up actual test files, not markdown/docs
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/*.md',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});