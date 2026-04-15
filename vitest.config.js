/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';
import path from 'path';

/**
 * Dedicated Vitest config — merged on top of vite.config.js so that
 * all Vite plugins (React, base44) are preserved for JSX transformation.
 *
 * Key additions over the basic vite.config.js test section:
 *   forceExit      — exits after all tests complete even if open handles
 *                    remain (e.g. React Query polling, window event listeners,
 *                    setInterval timers from CurrencyProvider, etc.)
 *   testTimeout    — 15 s ceiling so a genuinely stuck test fails fast
 *   hookTimeout    — 10 s ceiling for beforeEach / afterEach
 *   pool/isolate   — each test file runs in its own worker thread so a
 *                    leaked handle in one file cannot block others
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.js'],
      // Safety: exit cleanly even when open handles (timers, listeners) remain
      forceExit: true,
      // Generous-but-finite timeouts — a hanging test fails instead of hanging forever
      testTimeout: 15000,
      hookTimeout: 10000,
      // Isolate each file in its own thread so one leaked handle cannot block others
      pool: 'threads',
      poolOptions: {
        threads: {
          isolate: true,
        },
      },
      // Pick up all test files under src/ and any root __tests__/ directory
      include: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      exclude: [
        'node_modules',
        'dist',
        '**/*.md',
      ],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  })
);
