import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Set globals to false to align with explicit imports in test files (e.g., Badges.test.tsx)
    // and to follow modern Vitest defaults. This also resolves the type reference error.
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
