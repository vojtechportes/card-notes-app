import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          METRICS_AUTH_TOKEN: 'runtime-test-metrics-token',
        },
      },
    }),
  ],
  test: {
    include: ['test/runtime/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
