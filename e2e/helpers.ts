import { expect, type Page } from '@playwright/test'

// Contas do staging (.env.staging.local): store_admin da loja-e2e e o super_admin do seed.
export const STORE_ADMIN = { email: process.env.E2E_TEST_EMAIL, password: process.env.E2E_TEST_PASSWORD }
export const SUPER_ADMIN = { email: process.env.E2E_SUPER_EMAIL, password: process.env.E2E_SUPER_PASSWORD }

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
export const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!
export const E2E_STORE_ID = '00000000-0000-4000-a000-000000000003'

/** Sufixo curto e único por execução, pra nada colidir com dado de outra rodada. */
export const RUN = Date.now().toString(36).slice(-5)

export async function login(page: Page, account: { email?: string; password?: string }, storeId?: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(account.email!)
  await page.getByLabel('Senha').fill(account.password!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  if (storeId) {
    // super_admin escolhe a loja pelo seletor (persistido no localStorage)
    await page.evaluate(
      (id) => localStorage.setItem('splash-active-store', JSON.stringify({ state: { activeStoreId: id }, version: 0 })),
      storeId,
    )
  }
}

// Chama o PostgREST com a sessão de quem está logado na página (mesmas regras de acesso do painel).
export async function api(page: Page, path: string, init: { method?: string; body?: unknown } = {}) {
  return page.evaluate(
    async ({ url, anonKey, path, init }) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))!
      const token = JSON.parse(localStorage.getItem(key)!).access_token as string
      const response = await fetch(`${url}/rest/v1/${path}`, {
        method: init.method ?? 'GET',
        headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { url: SUPABASE_URL, anonKey: ANON_KEY, path, init },
  )
}

/** Aviso de sucesso do sonner (canto da tela). */
export async function expectToast(page: Page, text: string) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible({ timeout: 10_000 })
}

/** Confirma a janela "Excluir ..." padrão (ConfirmModal). */
export async function confirmDelete(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar exclusão' }).click()
}

/** PNG 1x1 pra campos de imagem obrigatórios. */
export const TINY_PNG = {
  name: 'e2e.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
}
