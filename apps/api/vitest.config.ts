import { defineConfig } from 'vitest/config';
import tsconfig from './tsconfig.json' with { type: 'json' };

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'test/**'],
    globals: false,
  },
  resolve: {
    alias: {},
  },
});
