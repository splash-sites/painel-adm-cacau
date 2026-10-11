import { expect, test } from '@playwright/test'

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

// Conta de teste = store_admin da `loja-e2e` do staging (seed em supabase/seed.sql).
const E2E_STORE_ID = '00000000-0000-4000-a000-000000000003'
const E2E_PRODUCT_AGUA = '00000000-0000-4000-c000-0000000000e2'

test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD não configurados em .env.staging.local')

// O painel não cria pedido — cria 1 em "received" pela mesma RPC pública que o
// cardápio usa, pra o teste não depender de pedido deixado por outro teste.
test.beforeAll(async () => {
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/confirm_order`, {
    method: 'POST',
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_store_id: E2E_STORE_ID,
      p_order_type: 'pickup',
      p_customer_name: 'Teste Playwright Painel',
      p_customer_cpf: '11144477735',
      p_customer_phone: '51999990000',
      p_delivery_address: null,
      p_items: [{ product_id: E2E_PRODUCT_AGUA, quantity: 1, note: null, addons: [], variations: [] }],
    }),
  })
  if (!response.ok) throw new Error(`confirm_order falhou: ${response.status} ${await response.text()}`)
})

test('login e avanço de status refletem no kanban', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL!)
  await page.getByLabel('Senha').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL('/')

  const receivedColumn = page.getByTestId('kanban-column-received')
  await expect(receivedColumn.getByTestId('order-card').first()).toBeVisible({ timeout: 10_000 })

  const card = receivedColumn.getByTestId('order-card').first()
  const orderId = await card.getAttribute('data-order-id')

  await card.getByRole('button', { name: 'Avançar etapa' }).click()

  await expect(page.getByText('Quem vai preparar?')).toBeVisible()
  await page.getByRole('button', { name: 'Novo atendente' }).click()
  const attendantName = `E2E ${Date.now()}`
  await page.getByLabel('Nome').fill(attendantName)
  await page.getByRole('dialog').filter({ hasText: 'Novo atendente' }).getByRole('button', { name: 'Salvar' }).click()
  await page.getByRole('button', { name: 'Aceitar pedido' }).click()

  const preparingColumn = page.getByTestId('kanban-column-preparing')
  const movedCard = preparingColumn.locator(`[data-order-id="${orderId}"]`)
  await expect(movedCard).toBeVisible({ timeout: 10_000 })

  await expect(receivedColumn.locator(`[data-order-id="${orderId}"]`)).toHaveCount(0)

  // limpa o atendente de teste — não pode excluir de verdade porque o pedido movido acima já
  // ficou vinculado a ele (FK on delete restrict), então só desativa.
  await page.goto('/atendentes')
  await page.getByRole('button', { name: `Editar ${attendantName}` }).click()
  await page.getByText('Atendente ativo').click()
  await page.getByRole('button', { name: 'Salvar' }).click()
})
