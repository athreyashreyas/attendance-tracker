import { defineConfig } from 'vitest/config';

/**
 * Tests cover the pure logic — attendance maths, the shape of a day, the
 * schedule — which needs no DOM and none of the app's build plugins. Kept in
 * its own config so the suite starts instantly rather than booting the PWA
 * pipeline on every run.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
