import { existsSync, readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Prints da central de ajuda (prestio.com.br/ajuda). Roda SÓ contra o staging, igual aos E2E:
// sobe o painel e o cardápio com `--mode staging` e se recusa a rodar se o staging faltar
// ou apontar pro mesmo Supabase da produção. Uso: pnpm prints:ajuda
function readUrl(file: string) {
  return existsSync(file) ? readFileSync(file, 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim() : undefined
}
const stagingUrl = readUrl('.env.staging.local')
if (!stagingUrl) throw new Error('Prints bloqueados: crie .env.staging.local com o VITE_SUPABASE_URL do staging.')
if (stagingUrl === readUrl('.env.local')) throw new Error('Prints bloqueados: .env.staging.local aponta pra produção.')
if (readUrl('../cacau-cardapio/.env.staging.local') !== stagingUrl) {
  throw new Error('Prints bloqueados: o .env.staging.local do cardápio precisa apontar pro mesmo staging do painel.')
}

config({ path: '.env.staging.local' })

export const PAINEL_PORT = 5180
export const CARDAPIO_PORT = 5181

export default defineConfig({
  testDir: './e2e/ajuda',
  testMatch: '**/*.prints.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 10 * 60_000,
  reporter: 'list',
  expect: { timeout: 15_000 },
  use: { ...devices['Desktop Chrome'], trace: 'off', actionTimeout: 20_000, navigationTimeout: 30_000 },
  webServer: [
    {
      command: `pnpm dev --mode staging --port ${PAINEL_PORT} --strictPort`,
      url: `http://localhost:${PAINEL_PORT}`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm --dir ../cacau-cardapio dev --mode staging --port ${CARDAPIO_PORT} --strictPort`,
      url: `http://localhost:${CARDAPIO_PORT}`,
      reuseExistingServer: false,
    },
  ],
})
