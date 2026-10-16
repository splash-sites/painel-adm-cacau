import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// E2E mexe em pedido de verdade: roda SEMPRE contra o staging. O servidor sobe
// com `--mode staging` (Vite carrega .env.staging.local por cima do .env.local).
// Trava: sem .env.staging.local apontando pra um projeto diferente do de
// producao, nao roda — senao o Vite cairia no .env.local (producao).
function readUrl(file: string) {
  return existsSync(file)
    ? readFileSync(file, 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
    : undefined
}
const stagingUrl = readUrl('.env.staging.local')
if (!stagingUrl) {
  throw new Error('E2E bloqueado: crie .env.staging.local com o VITE_SUPABASE_URL do staging.')
}
if (stagingUrl === readUrl('.env.local')) {
  throw new Error('E2E bloqueado: .env.staging.local aponta pro mesmo Supabase do .env.local (producao).')
}

// E2E_TEST_EMAIL / E2E_TEST_PASSWORD (conta de teste do staging) + VITE_SUPABASE_*
// do staging ficam disponiveis pros specs.
config({ path: '.env.staging.local' })

const PORT = 5178

export default defineConfig({
  testDir: './e2e',
  // prints da central de ajuda têm config própria (playwright.ajuda.config.ts)
  testIgnore: '**/ajuda/**',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm dev --mode staging --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // nunca reaproveitar servidor ja aberto: ele pode estar em modo producao
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
