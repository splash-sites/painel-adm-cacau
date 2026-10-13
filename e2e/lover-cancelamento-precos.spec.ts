import { expect, test, type Page } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!

// Conta de teste = store_admin da `loja-e2e` do staging (seed em supabase/seed.sql).
const E2E_STORE_ID = '00000000-0000-4000-a000-000000000003'
const AGUA = '00000000-0000-4000-c000-0000000000e2' // R$ 5,00 · Lover R$ 4,00, sem variação
const FONDUE = '00000000-0000-4000-c000-0000000000e1'
const BANANA = '00000000-0000-4000-d100-0000000000e1' // Fruta (replace) 24,00 · Lover 21,00
const CHOCOLATE_BRANCO = '00000000-0000-4000-d100-0000000000e4' // Chocolate (additive) 2,00 · Lover 2,00
const PRODUTO_DA_LOJA_A = '00000000-0000-4000-c000-0000000000a1' // Cappuccino, outra loja

test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD não configurados em .env.staging.local')

async function createOrder(customerName: string, quantity: number): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/confirm_order`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_store_id: E2E_STORE_ID,
      p_order_type: 'pickup',
      p_customer_name: customerName,
      p_customer_cpf: '11144477735',
      p_customer_phone: '51999990000',
      p_delivery_address: null,
      p_items: [{ product_id: AGUA, quantity, note: null, addons: [], variations: [] }],
    }),
  })
  if (!response.ok) throw new Error(`confirm_order falhou: ${response.status} ${await response.text()}`)
  return (await response.json()) as string
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL!)
  await page.getByLabel('Senha').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/', { timeout: 20_000 })
}

// Chama o PostgREST com a sessão do store_admin logado na página (mesmas regras de acesso do painel).
async function api(page: Page, path: string, init: { method?: string; body?: unknown } = {}) {
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

test('finalizar pergunta se o cliente é Cacau Lover e grava a resposta', async ({ page }) => {
  const orderId = await createOrder('E2E Lover', 2)
  await login(page)

  const cardIn = (column: string) => page.getByTestId(`kanban-column-${column}`).locator(`[data-order-id="${orderId}"]`)
  await expect(cardIn('received')).toBeVisible({ timeout: 10_000 })
  await expect(cardIn('received').getByText('Lover R$ 8,00')).toBeVisible()

  // aceitar (atendente do seed) → pronto pra retirada → entregue; espera o card mudar de coluna
  // antes de cada clique (o botão calcula a próxima etapa pelo status que está na tela)
  await cardIn('received').getByRole('button', { name: 'Aceitar pedido' }).click()
  await page.getByRole('radio', { name: 'Atendente E2E' }).check()
  await page.getByRole('button', { name: 'Aceitar pedido' }).click()
  await expect(cardIn('preparing')).toBeVisible({ timeout: 10_000 })

  await cardIn('preparing').getByRole('button', { name: 'Pronto pra retirada' }).click()
  await expect(cardIn('ready_for_pickup')).toBeVisible({ timeout: 10_000 })
  await cardIn('ready_for_pickup').getByRole('button', { name: 'Entregue' }).click()
  await expect(cardIn('delivered')).toBeVisible({ timeout: 10_000 })

  await cardIn('delivered').getByRole('button', { name: 'Finalizar' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: 'Cliente é Cacau Lover?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('R$ 10,00')).toBeVisible()
  await expect(dialog.getByText('R$ 8,00')).toBeVisible()
  await dialog.getByRole('button', { name: 'Sim, é Lover' }).click()
  await expect(dialog).toHaveCount(0)

  await expect
    .poll(async () => (await api(page, `orders?select=status,is_lover&id=eq.${orderId}`)).body[0])
    .toEqual({ status: 'finalized', is_lover: true })
})

test('cancelar exige motivo', async ({ page }) => {
  const orderId = await createOrder('E2E Cancelar', 1)
  await login(page)

  const card = page.locator(`[data-order-id="${orderId}"]`)
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.getByRole('button', { name: 'Cancelar' }).click()

  const dialog = page.getByRole('dialog').filter({ hasText: 'Cancelar pedido' })
  const confirm = dialog.getByRole('button', { name: 'Cancelar pedido' })
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel('Motivo do cancelamento').fill('   ')
  await expect(confirm).toBeDisabled()
  await dialog.getByLabel('Motivo do cancelamento').fill('teste E2E')
  await confirm.click()

  await expect
    .poll(async () => (await api(page, `orders?select=status,cancellation_reason&id=eq.${orderId}`)).body[0])
    .toEqual({ status: 'cancelled', cancellation_reason: 'teste E2E' })

  // o banco também recusa sem motivo (quem chama a função direto, sem a tela)
  const otherId = await createOrder('E2E Cancelar sem motivo', 1)
  const noReason = await api(page, 'rpc/change_order_status', {
    method: 'POST',
    body: { p_order_id: otherId, p_new_status: 'cancelled', p_reason: null },
  })
  expect(noReason.status).toBe(400)
  expect(noReason.body.message).toContain('motivo')
  await api(page, 'rpc/change_order_status', {
    method: 'POST',
    body: { p_order_id: otherId, p_new_status: 'cancelled', p_reason: 'limpeza do teste' },
  })
})

test('item adicionado pelo painel grava preço com variação (normal e Lover) e recusa opção alheia', async ({ page }) => {
  const orderId = await createOrder('E2E Preço Painel', 1)
  await login(page)

  const added = await api(page, 'rpc/add_order_item', {
    method: 'POST',
    body: {
      p_order_id: orderId,
      p_product_id: FONDUE,
      p_quantity: 1,
      p_variation_option_ids: [BANANA, CHOCOLATE_BRANCO],
      p_addons: [],
    },
  })
  expect(added.status).toBe(204)
  const items = await api(page, `order_items?select=unit_price,lover_unit_price&order_id=eq.${orderId}&product_id=eq.${FONDUE}`)
  // Banana substitui (24 / 21) + Chocolate branco soma (2 / 2)
  expect(items.body).toEqual([{ unit_price: 26, lover_unit_price: 23 }])

  const foreignOption = await api(page, 'rpc/add_order_item', {
    method: 'POST',
    body: { p_order_id: orderId, p_product_id: AGUA, p_quantity: 1, p_variation_option_ids: [BANANA], p_addons: [] },
  })
  expect(foreignOption.status).toBe(400)

  const otherStore = await api(page, 'rpc/catalog_unit_prices', {
    method: 'POST',
    body: { p_product_id: PRODUTO_DA_LOJA_A, p_variation_option_ids: [] },
  })
  expect(otherStore.status).toBe(400)

  await api(page, 'rpc/change_order_status', {
    method: 'POST',
    body: { p_order_id: orderId, p_new_status: 'cancelled', p_reason: 'limpeza do teste' },
  })
})
